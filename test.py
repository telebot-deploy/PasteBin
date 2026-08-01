import sqlite3

conn = sqlite3.connect("instance/paste.db")
print("Connected successfully!")
conn.close()