package com.techie.microservices.product.service;

import com.techie.microservices.product.dto.ProductImagePresignRequestDto;
import com.techie.microservices.product.vo.ProductImagePresignResponseVo;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.Http;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketCorsArgs;
import io.minio.messages.CORSConfiguration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class ProductImageStorageService {
    private static final int PRESIGN_EXPIRY_SECONDS = 900;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final MinioClient minioClient;
    private final MinioClient publicMinioClient;

    public ProductImageStorageService(@Qualifier("minioClient") MinioClient minioClient,
                                      @Qualifier("publicMinioClient") MinioClient publicMinioClient) {
        this.minioClient = minioClient;
        this.publicMinioClient = publicMinioClient;
    }

    @Value("${minio.bucket.product-images}")
    private String bucketName;

    @Value("${minio.product-images.public-path:/api/product/images}")
    private String publicPath;

    @Value("${minio.product-images.max-size-bytes:5242880}")
    private long maxSizeBytes;

    public ProductImagePresignResponseVo createPresignedUpload(UUID shopId, ProductImagePresignRequestDto request) {
        validate(request);

        String contentType = request.contentType().trim().toLowerCase(Locale.ROOT);
        String objectName = "%s-%s%s".formatted(shopId, UUID.randomUUID(), extension(request.fileName(), contentType));
        try {
            ensureBucketExists();
            String uploadUrl = publicMinioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Http.Method.PUT)
                    .bucket(bucketName)
                    .object(objectName)
                    .expiry(PRESIGN_EXPIRY_SECONDS)
                    .build());
            log.info("Created product image presigned upload URL for object {}", objectName);
            return new ProductImagePresignResponseVo(
                    objectName,
                    uploadUrl,
                    publicPath + "/" + objectName,
                    contentType,
                    maxSizeBytes,
                    PRESIGN_EXPIRY_SECONDS
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create product image upload URL", exception);
        }
    }

    public GetObjectResponse getObject(String objectName) {
        if (objectName == null || objectName.isBlank() || objectName.contains("/") || objectName.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image object name");
        }

        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product image not found", exception);
        }
    }

    private void validate(ProductImagePresignRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image upload request is required");
        }

        if (request.size() <= 0 || request.size() > maxSizeBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file must be 5 MB or smaller");
        }

        String contentType = request.contentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, WEBP, or GIF images are supported");
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                .bucket(bucketName)
                .build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder()
                    .bucket(bucketName)
                    .build());
        }
        minioClient.setBucketCors(SetBucketCorsArgs.builder()
                .bucket(bucketName)
                .config(new CORSConfiguration(List.of(new CORSConfiguration.CORSRule(
                        List.of("*"),
                        List.of("PUT", "GET", "HEAD"),
                        List.of("*"),
                        List.of("ETag"),
                        "product-images-direct-upload",
                        3600
                ))))
                .build());
    }

    private String extension(String originalFilename, String contentType) {
        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
                String extension = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);
                if (extension.matches("\\.(jpe?g|png|webp|gif)")) {
                    return extension;
                }
            }
        }

        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };
    }
}
