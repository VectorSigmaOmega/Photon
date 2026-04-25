package storage

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/carousell/swiftbatch/internal/config"
)

type StoredObject struct {
	Key         string
	ContentType string
	SizeBytes   int64
}

type MinIOClient struct {
	bucket        string
	client        *minio.Client
	presignClient *minio.Client
}

func NewMinIOClient(cfg config.StorageConfig) (*MinIOClient, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Region: cfg.Region,
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	presignEndpoint := cfg.PublicBaseURL
	if presignEndpoint == "" {
		scheme := "http"
		if cfg.UseSSL {
			scheme = "https"
		}

		presignEndpoint = fmt.Sprintf("%s://%s", scheme, cfg.Endpoint)
	}

	presignURL, err := url.Parse(presignEndpoint)
	if err != nil {
		return nil, err
	}

	presignClient, err := minio.New(presignURL.Host, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Region: cfg.Region,
		Secure: presignURL.Scheme == "https",
	})
	if err != nil {
		return nil, err
	}

	return &MinIOClient{
		bucket:        cfg.Bucket,
		client:        client,
		presignClient: presignClient,
	}, nil
}

func (c *MinIOClient) Ping(ctx context.Context) error {
	_, err := c.client.BucketExists(ctx, c.bucket)
	return err
}

func (c *MinIOClient) DownloadFile(ctx context.Context, objectKey, destinationPath string) error {
	return c.client.FGetObject(ctx, c.bucket, objectKey, destinationPath, minio.GetObjectOptions{})
}

func (c *MinIOClient) UploadFile(ctx context.Context, objectKey, sourcePath, contentType string) (StoredObject, error) {
	file, err := os.Open(sourcePath)
	if err != nil {
		return StoredObject{}, err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return StoredObject{}, err
	}

	_, err = c.client.PutObject(ctx, c.bucket, objectKey, file, stat.Size(), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return StoredObject{}, err
	}

	return StoredObject{
		Key:         objectKey,
		ContentType: contentType,
		SizeBytes:   stat.Size(),
	}, nil
}

func (c *MinIOClient) PresignUploadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	presignedURL, err := c.presignClient.PresignedPutObject(ctx, c.bucket, objectKey, expiry)
	if err != nil {
		return "", err
	}

	return presignedURL.String(), nil
}

func (c *MinIOClient) PresignDownloadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	presignedURL, err := c.presignClient.PresignedGetObject(ctx, c.bucket, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}

	return presignedURL.String(), nil
}
