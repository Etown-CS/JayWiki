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

    public BlobStorageService(IConfiguration configuration)
    {
        var connectionString = configuration["BlobStorage:ConnectionString"]
            ?? throw new InvalidOperationException("BlobStorage:ConnectionString is not configured.");

        _profileImagesContainer = configuration["BlobStorage:ProfileImagesContainer"]
            ?? "profile-images";

        _blobServiceClient = new BlobServiceClient(connectionString);
    }

    public async Task<string> UploadProfileImageAsync(IFormFile file, int userId)
    {
        return await UploadMediaAsync(file, _profileImagesContainer, userId);
    }

    public async Task<string> UploadMediaAsync(IFormFile file, string containerName, int parentId)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

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

        var uri = new Uri(blobUrl);

        // Extract container and blob name from URL path: /container-name/blob-name
        var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        if (segments.Length < 2) return;

        var containerName = segments[0]; // e.g. "profile-images"
        var blobName = segments[1];      // e.g. "42/1711234567890.jpg"

        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.DeleteIfExistsAsync();
    }
}