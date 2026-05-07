package com.example.app

import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.server.ResponseStatusException

fun Authentication.sub(): String = when (this) {
    is JwtAuthenticationToken -> token.subject
    is OAuth2AuthenticationToken -> principal.attributes["sub"] as String
    else -> throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
}

fun Authentication.extractName(): String = when (this) {
    is JwtAuthenticationToken -> token.claims["preferred_username"] as String? ?: name
    is OAuth2AuthenticationToken -> principal.attributes["preferred_username"] as String? ?: name
    else -> "Unknown"
}
