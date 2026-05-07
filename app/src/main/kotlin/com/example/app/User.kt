package com.example.app

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import org.springframework.data.mongodb.repository.MongoRepository

@Document(collection = "users")
data class UserAccount(
    @Id var id: String = "",
    var username: String = "",
    var name: String = "",
    var email: String = ""
)

interface UserRepository : MongoRepository<UserAccount, String>
