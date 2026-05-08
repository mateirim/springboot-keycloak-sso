package com.example.app

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.AuthenticationException
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class Security(
    @Value("\${app.cors.allowed-origins:http://localhost:4200}") private val allowedOrigins: List<String>,
    private val clientRegistrationRepository: ClientRegistrationRepository
) {
    // API chain — session auth + JWT Bearer tokens, returns 401 JSON for unauthenticated (no redirect)
    @Bean
    @Order(1)
    fun apiFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .securityMatcher("/api/**")
            .cors { }
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/health").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2ResourceServer { oauth2 -> oauth2.jwt { } }
            .exceptionHandling { it.authenticationEntryPoint(apiEntryPoint()) }

        return http.build()
    }

    // Browser chain — OAuth2 login with session, redirects to Keycloak when unauthenticated
    @Bean
    @Order(2)
    fun webFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { }
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/*.js", "/*.css", "/*.png", "/*.ico", "/favicon.ico", "/assets/**").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 -> oauth2.defaultSuccessUrl("/", true) }
            .logout { logout ->
                logout
                    .logoutSuccessHandler(oidcLogoutSuccessHandler())
                    .deleteCookies("JSESSIONID")
            }

        return http.build()
    }

    private fun apiEntryPoint() = AuthenticationEntryPoint { _: HttpServletRequest, response: HttpServletResponse, _: AuthenticationException ->
        response.status = HttpStatus.UNAUTHORIZED.value()
        response.contentType = "application/json"
        response.writer.write("{\"error\":\"Unauthorized\"}")
    }

    private fun oidcLogoutSuccessHandler() =
        OidcClientInitiatedLogoutSuccessHandler(clientRegistrationRepository).apply {
            setPostLogoutRedirectUri("{baseUrl}")
        }

    @Bean
    fun corsConfigurationSource() = UrlBasedCorsConfigurationSource().apply {
        registerCorsConfiguration("/**", CorsConfiguration().apply {
            allowedOrigins = this@Security.allowedOrigins
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type", "X-Requested-With", "Content-Disposition")
            allowCredentials = true
        })
    }

    @Bean
    fun jwtDecoder(
        @Value("\${KEYCLOAK_ISSUER_URI:}") issuerUri: String?,
        @Value("\${KEYCLOAK_SERVER_URL:http://keycloak.keycloak.svc.cluster.local}") keycloakServerUrl: String,
        @Value("\${KEYCLOAK_REALM:master}") realm: String
    ): JwtDecoder {
        val resolvedIssuer = if (!issuerUri.isNullOrBlank()) {
            issuerUri
        } else {
            "$keycloakServerUrl/realms/$realm"
        }
        return NimbusJwtDecoder.withIssuerLocation(resolvedIssuer).build()
    }
}
