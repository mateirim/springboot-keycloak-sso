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
import org.springframework.web.client.RestTemplate
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpEntity


@RestController
@RequestMapping("/api/social")
class SocialController(
    private val userRepository: UserRepository,
    @Value("\${keycloak.admin.server-url}") private val keycloakUrl: String,
    @Value("\${keycloak.admin.realm}") private val adminRealm: String,
    @Value("\${keycloak.admin.users-realm:\${keycloak.admin.realm}}") private val usersRealm: String,
    @Value("\${keycloak.admin.client-id}") private val adminClientId: String,
    @Value("\${keycloak.admin.client-secret}") private val adminClientSecret: String,
    @Value("\${keycloak.admin.username}") private val adminUsername: String,
    @Value("\${keycloak.admin.password}") private val adminPassword: String
) {
    private val rest = org.springframework.web.client.RestTemplate(
        org.springframework.boot.web.client.RestTemplateBuilder()
            .setConnectTimeout(java.time.Duration.ofSeconds(5))
            .setReadTimeout(java.time.Duration.ofSeconds(5))
            .build().requestFactory
    )
    private val log = LoggerFactory.getLogger(SocialController::class.java)

    @GetMapping("/users")
    fun getAllUsers(auth: Authentication): List<UserAccount> {
        val currentSub = auth.sub()
        return userRepository.findAll().filter { it.id != currentSub }
    }

    @GetMapping("/keycloak-users")
    fun getKeycloakUsers(auth: Authentication): List<Map<String, Any?>> {
        return try {
            // Priority 1: Use the current user's token if available (most secure/correct)
            val token = (auth as? org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken)
                ?.token?.tokenValue 
                ?: getAdminToken() ?: throw RuntimeException("No token available")

            val headers = HttpHeaders().apply { setBearerAuth(token) }
            @Suppress("UNCHECKED_CAST")
            val users = rest.exchange(
                "$keycloakUrl/admin/realms/$usersRealm/users?max=200",
                org.springframework.http.HttpMethod.GET,
                HttpEntity<Void>(headers),
                List::class.java
            ).body as? List<Map<String, Any?>> ?: emptyList()
            
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
            log.warn("Keycloak discovery failed or timed out: ${e.message}. Falling back to local registry.")
            // Final fallback to local registry if everything else fails
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
            val form = LinkedMultiValueMap<String, String>().apply {
                add("grant_type", "password")
                add("client_id", "admin-cli")
                add("username", adminUsername)
                add("password", adminPassword)
            }
            val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_FORM_URLENCODED }
            @Suppress("UNCHECKED_CAST")
            val resp = rest.postForObject(
                "$keycloakUrl/realms/master/protocol/openid-connect/token",
                HttpEntity(form, headers),
                Map::class.java
            ) as? Map<String, Any?>
            val token = resp?.get("access_token") as? String
            if (token != null) return token
        } catch (e: Exception) {
            log.warn("Admin password grant failed: ${e.message}")
        }

        // 2. Try Client Credentials
        try {
            val form = LinkedMultiValueMap<String, String>().apply {
                add("grant_type", "client_credentials")
                add("client_id", adminClientId)
                add("client_secret", adminClientSecret)
            }
            val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_FORM_URLENCODED }
            @Suppress("UNCHECKED_CAST")
            val resp = rest.postForObject(
                "$keycloakUrl/realms/$adminRealm/protocol/openid-connect/token",
                HttpEntity(form, headers),
                Map::class.java
            ) as? Map<String, Any?>
            val token = resp?.get("access_token") as? String
            if (token != null) return token
        } catch (e: Exception) {
            log.error("Admin client_credentials grant failed: ${e.message}")
        }
        
        return null
    }

}
