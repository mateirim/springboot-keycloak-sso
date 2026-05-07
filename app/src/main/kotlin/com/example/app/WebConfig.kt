package com.example.app

import org.springframework.context.annotation.Configuration
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver
import java.io.IOException

@Configuration
class WebConfig : WebMvcConfigurer {
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                @Throws(IOException::class)
                override fun getResource(resourcePath: String, location: Resource): Resource? {
                    val requestedResource = location.createRelative(resourcePath)
                    if (requestedResource.exists() && requestedResource.isReadable) {
                        return requestedResource
                    }
                    // SPA fallback — skip API, OAuth2, and WS paths
                    if (resourcePath.startsWith("api/") || resourcePath.startsWith("login/") || resourcePath.startsWith("oauth2/") || resourcePath.startsWith("ws-games/")) {
                        return null
                    }
                    return location.createRelative("index.html")
                }
            })
    }
}
