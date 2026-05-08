package com.example.app

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.context.bean.override.mockito.MockitoBean

/**
 * Integration tests validating the security and role-enforcement behaviour
 * of the core controllers in the LIGHT version.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@org.springframework.test.context.TestPropertySource(properties = [
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration"
])
class AppTests {

    @MockitoBean
    lateinit var clientRegistrationRepository: org.springframework.security.oauth2.client.registration.ClientRegistrationRepository

    @MockitoBean
    lateinit var jwtDecoder: org.springframework.security.oauth2.jwt.JwtDecoder

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `health check is public and returns 200`() {
        mockMvc.get("/api/health").andExpect { status { isOk() } }
    }

    @Test
    fun `unauthenticated request to user-info returns 401`() {
        mockMvc.get("/api/user/info").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `application context loads`() {
    }
}
