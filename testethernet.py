
import socket
import csv
from datetime import datetime

UDP_IP = "0.0.0.0"
UDP_PORT = 12345

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

filename = "hx711_ethernet.csv"

print(f"Listening UDP on port {UDP_PORT}")
print("Waiting for ESP32-S3...")

with open(filename, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)

    writer.writerow([
        "PC_Time",
        "Sample",
        "ESP_Time_ms",
        "RAW1", "DELTA1",
        "RAW2", "DELTA2",
        "RAW3", "DELTA3"
    ])
    f.flush()

    while True:
        data, addr = sock.recvfrom(2048)

        message = data.decode(
            "utf-8", errors="replace"
        ).strip()

        if not message.startswith("DATA,"):
            continue

        values = message.split(",")

        if len(values) != 9:
            print("Invalid packet:", message)
            continue

        pc_time = datetime.now().isoformat(
            timespec="milliseconds"
        )

        writer.writerow([pc_time] + values[1:])
        f.flush()

        print(f"{addr[0]}: {message}")
