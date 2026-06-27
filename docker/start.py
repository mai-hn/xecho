import os
import signal
import subprocess
import sys
import time


def start_process(command: list[str], cwd: str) -> subprocess.Popen[bytes]:
    return subprocess.Popen(command, cwd=cwd)


def stop_processes(processes: list[subprocess.Popen[bytes]]) -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()

    deadline = time.time() + 10
    while time.time() < deadline:
        if all(process.poll() is not None for process in processes):
            return
        time.sleep(0.2)

    for process in processes:
        if process.poll() is None:
            process.kill()


def main() -> int:
    os.makedirs("/data", exist_ok=True)

    api_host = os.getenv("API_HOST", "127.0.0.1")
    api_port = os.getenv("API_PORT", "8000")
    web_port = os.getenv("PORT", "3000")

    api = start_process(
        ["uvicorn", "main:app", "--host", api_host, "--port", api_port],
        "/app/backend",
    )
    web = start_process(["node", "server.js"], "/app")
    processes = [api, web]

    def handle_signal(signum: int, _frame: object) -> None:
        stop_processes(processes)
        sys.exit(128 + signum)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    print(f"xEcho web listening on 0.0.0.0:{web_port}", flush=True)
    print(f"xEcho api listening on {api_host}:{api_port}", flush=True)

    while True:
        for process in processes:
            exit_code = process.poll()
            if exit_code is not None:
                stop_processes(processes)
                return exit_code
        time.sleep(1)


if __name__ == "__main__":
    raise SystemExit(main())
