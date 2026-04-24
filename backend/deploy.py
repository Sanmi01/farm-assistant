import os
import shutil
import subprocess
import zipfile


PACKAGE_DIR = "lambda-package"
ZIP_NAME = "lambda-deployment.zip"

APP_FILES = ["lambda_handler.py"]
APP_DIRS = ["app"]


def main() -> None:
    print("Creating Lambda deployment package...")

    if os.path.exists(PACKAGE_DIR):
        shutil.rmtree(PACKAGE_DIR)
    if os.path.exists(ZIP_NAME):
        os.remove(ZIP_NAME)

    os.makedirs(PACKAGE_DIR)

    print("Installing dependencies for Lambda runtime...")
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{os.getcwd()}:/var/task",
            "--platform",
            "linux/amd64",
            "--entrypoint",
            "",
            "public.ecr.aws/lambda/python:3.12",
            "/bin/sh",
            "-c",
            (
                "pip install --target /var/task/"
                + PACKAGE_DIR
                + " -r /var/task/requirements.txt "
                + "--platform manylinux2014_x86_64 "
                + "--only-binary=:all: --upgrade"
            ),
        ],
        check=True,
    )

    print("Copying application files...")
    for file in APP_FILES:
        if os.path.exists(file):
            shutil.copy2(file, f"{PACKAGE_DIR}/")
        else:
            raise FileNotFoundError(f"Required app file not found: {file}")

    for directory in APP_DIRS:
        if not os.path.isdir(directory):
            raise FileNotFoundError(f"Required app directory not found: {directory}")
        shutil.copytree(
            directory,
            f"{PACKAGE_DIR}/{directory}",
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo"),
        )

    print("Creating zip file...")
    with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _dirs, files in os.walk(PACKAGE_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, PACKAGE_DIR)
                zipf.write(file_path, arcname)

    size_mb = os.path.getsize(ZIP_NAME) / (1024 * 1024)
    print(f"✓ Created {ZIP_NAME} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()