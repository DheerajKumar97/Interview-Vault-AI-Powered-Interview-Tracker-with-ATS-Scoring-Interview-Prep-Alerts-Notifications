# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install uv - the fast Python package manager
RUN pip install uv

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install packages using uv (10-100x faster than pip)
RUN uv pip install --system --no-cache -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
