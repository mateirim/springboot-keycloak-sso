package com.example.app

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.ApplicationListener
import org.springframework.context.annotation.Bean
import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.core.query.Criteria
import org.springframework.data.mongodb.core.query.Query
import org.springframework.data.mongodb.gridfs.GridFsTemplate
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.security.authentication.event.AuthenticationSuccessEvent
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@SpringBootApplication
class Main

fun main(args: Array<String>) {
    runApplication<Main>(*args)
}

@Document(collection = "users")
data class UserAccount(
    @Id var id: String = "",
    var username: String = "",
    var name: String = "",
    var email: String = ""
)

interface UserRepository : MongoRepository<UserAccount, String>

@Component
class AuthenticationEventListener(private val userRepository: UserRepository) : ApplicationListener<AuthenticationSuccessEvent> {
    override fun onApplicationEvent(event: AuthenticationSuccessEvent) {
        val auth = event.authentication
        if (auth is OAuth2AuthenticationToken) {
            val attrs = auth.principal.attributes
            val sub = (attrs["sub"] as? String) ?: return
            val log = LoggerFactory.getLogger(AuthenticationEventListener::class.java)
            
            val user = userRepository.findById(sub).orElse(UserAccount()).apply {
                id = sub
                username = (attrs["preferred_username"] as? String) ?: (attrs["sub"] as? String) ?: "unknown"
                name = (attrs["name"] as? String) ?: (attrs["given_name"] as? String) ?: username
                email = (attrs["email"] as? String) ?: ""
            }
            userRepository.save(user)
            log.info("Synchronized user from Keycloak: ${user.username} ($sub)")
        }
    }
}

@RestController
class HealthController {
    @GetMapping("/api/health")
    fun health() = "OK"
}

@RestController
@RequestMapping("/api/user")
class UserController(
    private val locationRepository: LocationRepository,
    private val favouriteRepository: FavouriteRepository,
    private val friendRepository: FriendRepository,
    private val gridFsTemplate: GridFsTemplate,
    private val mongoTemplate: org.springframework.data.mongodb.core.MongoTemplate
) {
    @GetMapping("/info")
    fun getUserInfo(auth: Authentication): Map<String, Any> {
        val info = mutableMapOf<String, Any>()

        when (auth) {
            is JwtAuthenticationToken -> extractClaims(info, auth.token.claims)
            is OAuth2AuthenticationToken -> extractClaims(info, auth.principal.attributes)
            else -> info["error"] = "Not authenticated"
        }

        return info
    }

    private fun extractClaims(info: MutableMap<String, Any>, attrs: Map<String, Any?>) {
        info["username"] = attrs["preferred_username"] ?: "Unknown"
        info["email"] = attrs["email"] ?: ""
        info["name"] = attrs["name"] ?: ""
        val realmAccess = attrs["realm_access"]
        val roles: List<String>? = when (realmAccess) {
            is Map<*, *> -> (realmAccess["roles"] as? List<*>)?.filterIsInstance<String>()
            else -> null
        }
        if (!roles.isNullOrEmpty()) info["roles"] = roles
    }

    @PostMapping("/reset")
    fun resetUserData(auth: Authentication): Map<String, String> {
        val userId = auth.sub()
        val log = LoggerFactory.getLogger(UserController::class.java)

        return try {
            log.info("Reset requested for user: $userId")
            deleteUserData(userId, log)
            log.info("Reset complete for user: $userId")
            mapOf("message" to "User data reset successfully")
        } catch (e: Exception) {
            log.error("Reset failed for user $userId: ${e.message}", e)
            mapOf("error" to "Reset failed: ${e.message}")
        }
    }

    private fun deleteUserData(userId: String, log: org.slf4j.Logger) {
        favouriteRepository.deleteByUserId(userId)
        friendRepository.deleteByUserId(userId)
        deleteUserFiles(userId, log)
    }

    private fun deleteUserFiles(userId: String, log: org.slf4j.Logger) {
        try {
            val fileQuery = Query(Criteria.where("metadata.userId").`is`(userId))
            gridFsTemplate.delete(fileQuery)
        } catch (e: Exception) {
            log.warn("Failed to delete files for user $userId: ${e.message}")
        }
    }
}

@Controller
class ForwardController {
    @RequestMapping(value = ["/dashboard", "/creator", "/files", "/info", "/user"])
    fun forward() = "forward:/index.html"
}

@Bean
fun initData(locationRepository: LocationRepository): CommandLineRunner {
    val log = LoggerFactory.getLogger("DataInitializer")
    return CommandLineRunner {
        if (locationRepository.count() == 0L) {
            locationRepository.saveAll(listOf(
                Location(name = "Central Park", description = "A large public, urban park in the city center.", category = "Park", lat = 40.7812, lng = -73.9665),
                Location(name = "Art Museum", description = "A museum featuring modern and contemporary art.", category = "Museum", lat = 40.7614, lng = -73.9776)
            ))
            log.info("Sample data injected into MongoDB.")
        }
    }
}
