package com.example.app

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@SpringBootApplication
class Main

fun main(args: Array<String>) {
    runApplication<Main>(*args)
}

@RestController
class HealthController {
    @GetMapping("/api/health")
    fun health() = "OK"
}

@RestController
@RequestMapping("/api/user")
class UserController {
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
}

@Controller
class ForwardController {
    @RequestMapping(value = ["/dashboard", "/info"])
    fun forward() = "forward:/index.html"
}
