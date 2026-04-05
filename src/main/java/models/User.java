package models;

public class User {
    public String name;
    public String phone;
    public boolean active;

    public User() {}

    public User(String name, String phone, boolean active) {
        this.name = name;
        this.phone = phone;
        this.active = active;
    }
}