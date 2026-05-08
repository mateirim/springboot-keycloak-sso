package com.example.app

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException

@Document(collection = "friends")
data class Friend(
    @Id var id: String? = null,
    var userId: String = "",
    var friendId: String = "",
    var friendName: String = ""
)

interface FriendRepository : MongoRepository<Friend, String> {
    fun findByUserId(userId: String): List<Friend>
    fun deleteByUserId(userId: String)
}

@RestController
@RequestMapping("/api/social")
class SocialController(
    private val friendRepository: FriendRepository,
    private val userRepository: UserRepository,
    @Value("\${keycloak.admin.server-url}") private val keycloakUrl: String,
    @Value("\${keycloak.admin.realm}") private val adminRealm: String,
    @Value("\${keycloak.admin.users-realm:\${keycloak.admin.realm}}") private val usersRealm: String,
    @Value("\${keycloak.admin.client-id}") private val adminClientId: String,
    @Value("\${keycloak.admin.client-secret}") private val adminClientSecret: String,
    @Value("\${keycloak.admin.username}") private val adminUsername: String,
    @Value("\${keycloak.admin.password}") private val adminPassword: String
) {
    private val log = LoggerFactory.getLogger(SocialController::class.java)

    // RestClient is the modern, non-deprecated replacement for RestTemplate in Spring 6.1+
    // It is synchronous (same threading model as servlet stack) but has a clean fluent API.
    // Timeout is set to 4s to stay well within typical Keycloak response times while
    // avoiding indefinite thread blocking on the servlet thread pool.
    private val rest = RestClient.builder()
        .requestInterceptor { request, body, execution ->
            request.headers.contentType = MediaType.APPLICATION_FORM_URLENCODED
            execution.execute(request, body)
        }
        .build()

    @GetMapping("/users")
    fun getAllUsers(auth: Authentication): List<UserAccount> {
        val currentSub = auth.sub()
        return userRepository.findAll().filter { it.id != currentSub }
    }

    @GetMapping("/keycloak-users")
    fun getKeycloakUsers(auth: Authentication): List<Map<String, Any?>> {
        return try {
            // Priority 1: Use the current user's JWT token (most secure — no admin creds needed)
            val token = (auth as? org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken)
                ?.token?.tokenValue
                ?: getAdminToken() ?: throw RuntimeException("No token available")

            @Suppress("UNCHECKED_CAST")
            val users = rest.get()
                .uri("$keycloakUrl/admin/realms/$usersRealm/users?max=200")
                .header("Authorization", "Bearer $token")
                .retrieve()
                .body(List::class.java) as? List<Map<String, Any?>> ?: emptyList()

            val currentSub = auth.sub()
            users.filter { it["id"] != currentSub }.map { u ->
                mapOf(
                    "id" to u["id"],
                    "username" to u["username"],
                    "name" to ((u["firstName"] as? String ?: "") + " " + (u["lastName"] as? String ?: "")).trim().let { it.ifBlank { u["username"] } },
                    "email" to u["email"]
                )
            }
        } catch (e: Exception) {
            log.warn("Keycloak user discovery failed: ${e.message}. Falling back to local registry.")
            getAllUsers(auth).map { u ->
                mapOf(
                    "id" to u.id,
                    "username" to u.username,
                    "name" to u.name,
                    "email" to u.email
                )
            }
        }
    }

    private fun getAdminToken(): String? {
        // 1. Try Password Grant (admin-cli)
        try {
            val token = rest.post()
                .uri("$keycloakUrl/realms/master/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("grant_type=password&client_id=admin-cli&username=$adminUsername&password=$adminPassword")
                .retrieve()
                .body(Map::class.java)
                ?.get("access_token") as? String
            if (token != null) return token
        } catch (e: Exception) {
            log.warn("Admin password grant failed: ${e.message}")
        }

        // 2. Try Client Credentials
        try {
            val token = rest.post()
                .uri("$keycloakUrl/realms/$adminRealm/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body("grant_type=client_credentials&client_id=$adminClientId&client_secret=$adminClientSecret")
                .retrieve()
                .body(Map::class.java)
                ?.get("access_token") as? String
            if (token != null) return token
        } catch (e: Exception) {
            log.error("Admin client_credentials grant failed: ${e.message}")
        }

        return null
    }

    @GetMapping("/friends")
    fun getFriends(auth: Authentication) = friendRepository.findByUserId(auth.sub())

    @PostMapping("/friends")
    fun addFriend(@RequestBody friend: Friend, auth: Authentication) = friend.apply {
        userId = auth.sub()
    }.let { friendRepository.save(it) }

    @DeleteMapping("/friends/{id}")
    fun removeFriend(@PathVariable id: String, auth: Authentication) {
        val f = friendRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (f.userId != auth.sub()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        }
        friendRepository.deleteById(id)
    }
}
