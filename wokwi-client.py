import asyncio
import os

from wokwi_client import GET_TOKEN_URL, WokwiClient


async def main() -> None:
    token = os.getenv("WOKWI_CLI_TOKEN")
    if not token:
        raise SystemExit(
            f"Set WOKWI_CLI_TOKEN in your environment. You can get it from {GET_TOKEN_URL}."
        )

    client = WokwiClient(token)
    print(f"Wokwi client library version: {client.version}")

    hello = await client.connect()
    print("Connected to Wokwi Simulator, server version:", hello["version"])

    # Upload the diagram and firmware files

    await client.upload_file("diagram.json", "diagram.json")
    await client.upload_file("jaculus.bin", "jaculus.bin")
    await client.upload_file("jaculus.elf", "jaculus.elf")

    # Start the simulation
    await client.start_simulation(
        firmware="jaculus.bin",
        elf="jaculus.elf",
    )

    serial_task = asyncio.create_task(client.serial_monitor_cat())

    await client.wait_until_simulation_time(60)

    serial_task.cancel()
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
