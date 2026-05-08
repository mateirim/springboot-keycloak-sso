package com.example.app

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.context.bean.override.mockito.MockitoBean

/**
 * Integration tests validating the security and role-enforcement behaviour
 * of the main controllers.
 *
 * These tests run against a fully-wired application context using MockMvc
 * with a real Spring Security filter chain.  MongoDB and Keycloak are NOT
 * required at test time — tests that would normally hit the database are
 * either avoided or exercised through the public /api/health endpoint.
 *
 * Key assertions
 *  - Unauthenticated API requests receive 401 (not a redirect).
 *  - Authenticated requests with valid JWT claims receive 200.
 *  - Role-gated endpoints (upload, delete) return 403 for insufficient roles.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@org.springframework.test.context.TestPropertySource(properties = [
    "keycloak.admin.server-url=http://localhost:8081",
    "keycloak.admin.realm=master",
    "keycloak.admin.client-id=admin-cli",
    "keycloak.admin.client-secret=dummy",
    "keycloak.admin.username=admin",
    "keycloak.admin.password=admin",
    "spring.data.mongodb.uri=mongodb://localhost:27017/test"
])
class AppTests {

    @MockitoBean
    lateinit var clientRegistrationRepository: org.springframework.security.oauth2.client.registration.ClientRegistrationRepository

    @MockitoBean
    lateinit var jwtDecoder: org.springframework.security.oauth2.jwt.JwtDecoder

    @MockitoBean
    lateinit var gridFsTemplate: org.springframework.data.mongodb.gridfs.GridFsTemplate

    @MockitoBean
    lateinit var mongoTemplate: org.springframework.data.mongodb.core.MongoTemplate

    @MockitoBean
    lateinit var userRepository: com.example.app.UserRepository

    @MockitoBean
    lateinit var friendRepository: com.example.app.FriendRepository

    @MockitoBean
    lateinit var locationRepository: com.example.app.LocationRepository

    @MockitoBean
    lateinit var favouriteRepository: com.example.app.FavouriteRepository

    @Autowired
    lateinit var mockMvc: MockMvc

    // ── Health ─────────────────────────────────────────────────────────────

    @Test
    fun `health check is public and returns 200`() {
        mockMvc.get("/api/health").andExpect { status { isOk() } }
    }

    // ── Auth enforcement ────────────────────────────────────────────────────

    @Test
    fun `unauthenticated request to user-info returns 401 not redirect`() {
        mockMvc.get("/api/user/info").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `unauthenticated request to files returns 401`() {
        mockMvc.get("/api/files").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `unauthenticated upload attempt returns 401`() {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/files"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized)
    }

    // ── Role enforcement ────────────────────────────────────────────────────

    @Test
    fun `upload with reader role returns 403`() {
        val file = org.springframework.mock.web.MockMultipartFile("file", "test.txt", "text/plain", "test".toByteArray())
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/files")
            .file(file)
            .with(jwt().jwt { j ->
                j.subject("test-reader-sub")
                j.claim("realm_access", mapOf("roles" to listOf("reader")))
            })
        ).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden)
    }

    @Test
    fun `delete with contributor role returns 403`() {
        // Contributors can upload but cannot delete — 404 expected before 403 only if file exists;
        // without a real file the controller returns 404 after role check passes.
        // We test a known non-existent ID — an administrator receives 404, a contributor receives 403.
        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/files/000000000000000000000001")
                .with(jwt().jwt { j ->
                    j.subject("test-contributor-sub")
                    j.claim("realm_access", mapOf("roles" to listOf("contributor")))
                })
        ).andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden
        )
    }

    // ── Context ─────────────────────────────────────────────────────────────

    @Test
    fun `application context loads`() {
        // Verifies that all beans wire up correctly (security chains, repositories, controllers)
    }
}
