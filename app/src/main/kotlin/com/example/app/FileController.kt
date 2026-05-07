package com.example.app

import com.mongodb.client.gridfs.model.GridFSFile
import org.bson.Document
import org.bson.types.ObjectId
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.data.mongodb.core.query.Criteria
import org.springframework.data.mongodb.core.query.Query
import org.springframework.data.mongodb.core.query.Update
import org.springframework.data.mongodb.gridfs.GridFsTemplate
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/files")
class FileController(
    private val gridFsTemplate: GridFsTemplate,
    private val mongoTemplate: MongoTemplate
) {
    private fun hasRole(auth: Authentication, role: String): Boolean {
        val roles = when (auth) {
            is org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken ->
                auth.tokenAttributes["realm_access"]?.let { (it as? Map<*, *>)?.get("roles") as? List<*> }?.filterIsInstance<String>() ?: emptyList()
            is org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken ->
                auth.principal.getAttribute<Map<*, *>>("realm_access")?.get("roles") as? List<*> ?: emptyList()
            else -> emptyList()
        }
        return (roles as? List<*>)?.contains(role) == true
    }

    private fun canUpload(auth: Authentication): Boolean = hasRole(auth, "contributor") || hasRole(auth, "administrator")
    private fun canDelete(auth: Authentication): Boolean = hasRole(auth, "administrator")
    @GetMapping
    fun listFiles(auth: Authentication): List<Map<String, Any>> {
        val userId = auth.sub()
        val cursor = gridFsTemplate.find(
            Query(
                Criteria().orOperator(
                    Criteria.where("metadata.userId").`is`(userId),
                    Criteria.where("metadata.sharedWith").`is`(userId)
                )
            )
        )
        val result = mutableListOf<Map<String, Any>>()
        cursor.forEach { f ->
            result.add(
                mapOf(
                    "id" to f.objectId.toHexString(),
                    "filename" to (f.filename ?: ""),
                    "size" to f.length,
                    "uploadDate" to (f.uploadDate?.toString() ?: ""),
                    "ownerId" to (f.metadata?.get("userId") ?: "unknown"),
                    "isOwner" to (f.metadata != null && userId == f.metadata!!["userId"]),
                    "contentType" to (f.metadata?.get("contentType") ?: "application/octet-stream")
                )
            )
        }
        return result
    }

    @PostMapping("/{id}/share")
    fun shareFile(
        @PathVariable id: String,
        @RequestBody body: Map<String, String>,
        auth: Authentication
    ): ResponseEntity<Map<String, String>> {
        val userId = auth.sub()
        val shareWithId = body["userId"] ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST)

        val file = gridFsTemplate.findOne(
            Query(
                Criteria.where("_id").`is`(ObjectId(id))
                    .and("metadata.userId").`is`(userId)
            )
        ) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

        mongoTemplate.updateFirst(
            Query(Criteria.where("_id").`is`(ObjectId(id))),
            Update().addToSet("metadata.sharedWith", shareWithId),
            "fs.files"
        )

        return ResponseEntity.ok(mapOf("message" to "Shared with $shareWithId"))
    }

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @RequestParam("file") file: MultipartFile,
        auth: Authentication
    ): ResponseEntity<Map<String, String>> {
        if (!canUpload(auth)) throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only contributors and administrators can upload files")

        val userId = auth.sub()
        val metadata = Document("userId", userId)
            .append("contentType", file.contentType)

        val id = gridFsTemplate.store(
            file.inputStream,
            file.originalFilename,
            metadata
        )

        return ResponseEntity.ok(
            mapOf(
                "id" to id.toHexString(),
                "filename" to (file.originalFilename ?: "")
            )
        )
    }

    @GetMapping("/{id}")
    fun download(
        @PathVariable id: String,
        auth: Authentication
    ): ResponseEntity<ByteArray> {
        val userId = auth.sub()
        val file = gridFsTemplate.findOne(
            Query(
                Criteria.where("_id").`is`(ObjectId(id))
                    .orOperator(
                        Criteria.where("metadata.userId").`is`(userId),
                        Criteria.where("metadata.sharedWith").`is`(userId)
                    )
            )
        ) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

        val data = gridFsTemplate.getResource(file).inputStream.readAllBytes()
        val contentType = file.metadata?.get("contentType")?.toString()
            ?: "application/octet-stream"

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${file.filename}\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(data)
    }

    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: String,
        auth: Authentication
    ): ResponseEntity<Void> {
        if (!canDelete(auth)) throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can delete files")

        val userId = auth.sub()
        val file = gridFsTemplate.findOne(
            Query(
                Criteria.where("_id").`is`(ObjectId(id))
                    .and("metadata.userId").`is`(userId)
            )
        ) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

        gridFsTemplate.delete(Query(Criteria.where("_id").`is`(ObjectId(id))))
        return ResponseEntity.noContent().build()
    }
}
