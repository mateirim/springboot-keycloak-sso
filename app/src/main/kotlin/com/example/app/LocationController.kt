package com.example.app

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.repository.MongoRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@Document(collection = "locations")
data class Location(
    @Id var id: String = "",
    var name: String = "",
    var description: String = "",
    var lat: Double = 0.0,
    var lng: Double = 0.0,
    var category: String = ""
)

@Document(collection = "favourites")
data class Favourite(
    @Id var id: String? = null,
    var name: String = "",
    var locationId: String = "",
    var userId: String = ""
)

interface LocationRepository : MongoRepository<Location, String>

interface FavouriteRepository : MongoRepository<Favourite, String> {
    fun findByUserId(userId: String): List<Favourite>
    fun deleteByUserId(userId: String)
}

@RestController
@RequestMapping("/api")
class LocationController(
    private val locationRepository: LocationRepository,
    private val favouriteRepository: FavouriteRepository
) {
    @GetMapping("/locations")
    fun getLocations() = locationRepository.findAll()

    @GetMapping("/favourites")
    fun getFavourites(auth: Authentication) = favouriteRepository.findByUserId(auth.sub())

    @PostMapping("/favourites")
    fun addFavourite(@RequestBody favourite: Favourite, auth: Authentication) = favourite.apply {
        userId = auth.sub()
    }.let { favouriteRepository.save(it) }

    @DeleteMapping("/favourites/{id}")
    fun deleteFavourite(@PathVariable id: String, auth: Authentication) {
        val fav = favouriteRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (fav.userId != auth.sub()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        }
        favouriteRepository.deleteById(id)
    }
}
