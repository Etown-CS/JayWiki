using System.Collections.Concurrent;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Backend.Services;

public interface IBlobStorageService
{
    Task<string> UploadProfileImageAsync(IFormFile file, int userId);
    Task<string> UploadMediaAsync(IFormFile file, string containerName, int parentId);
    Task DeleteBlobAsync(string blobUrl);
}

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly string _profileImagesContainer;
    private readonly ConcurrentDictionary<string, bool> _ensuredContainers = new();

    public BlobStorageService(IConfiguration configuration)
    {
        var connectionString = configuration["BlobStorage:ConnectionString"];
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("BlobStorage:ConnectionString is not configured.");

        _profileImagesContainer = configuration["BlobStorage:ProfileImagesContainer"]
            ?? "profile-images";

        _blobServiceClient = new BlobServiceClient(connectionString);
    }

    private async Task EnsureContainerExistsAsync(BlobContainerClient containerClient)
    {
        if (_ensuredContainers.ContainsKey(containerClient.Name)) return;

        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);
        _ensuredContainers[containerClient.Name] = true;
    }

    public async Task<string> UploadProfileImageAsync(IFormFile file, int userId)
    {
        return await UploadMediaAsync(file, _profileImagesContainer, userId);
    }

    public async Task<string> UploadMediaAsync(IFormFile file, string containerName, int parentId)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        await EnsureContainerExistsAsync(containerClient);

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var blobName = $"{parentId}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{extension}";

        var blobClient = containerClient.GetBlobClient(blobName);

        var blobHttpHeaders = new BlobHttpHeaders
        {
            ContentType = file.ContentType
        };

        await using var stream = file.OpenReadStream();
        await blobClient.UploadAsync(stream, new BlobUploadOptions
        {
            HttpHeaders = blobHttpHeaders
        });

        return blobClient.Uri.ToString();
    }

    public async Task DeleteBlobAsync(string blobUrl)
    {
        if (string.IsNullOrWhiteSpace(blobUrl)) return;

        // use TryCreate so a malformed URL can't crash the request pipeline
        if (!Uri.TryCreate(blobUrl, UriKind.Absolute, out var uri)) return;

        // validate host matches our storage account to prevent unintended deletions
        var expectedHost = _blobServiceClient.Uri.Host;
        if (!uri.Host.Equals(expectedHost, StringComparison.OrdinalIgnoreCase)) return;

        // extract and validate against an allowlist of known containers
        var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        if (segments.Length < 2) return;

        var containerName = segments[0];
        var blobName = segments[1];

        // only allow deletion from known containers
        var allowedContainers = new[] { _profileImagesContainer, "project-media", "event-media" };
        if (!allowedContainers.Contains(containerName)) return;

        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.DeleteIfExistsAsync();
    }
}