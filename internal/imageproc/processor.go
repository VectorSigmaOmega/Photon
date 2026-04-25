package imageproc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Transform struct {
	Name    string `json:"name"`
	Width   int    `json:"width,omitempty"`
	Height  int    `json:"height,omitempty"`
	Quality string `json:"quality,omitempty"`
}

type GeneratedFile struct {
	ContentType string
	Path        string
	SizeBytes   int64
	VariantName string
}

type Processor struct{}

func NewProcessor() *Processor {
	return &Processor{}
}

func ParseTransforms(raw json.RawMessage) ([]Transform, error) {
	var transforms []Transform
	if err := json.Unmarshal(raw, &transforms); err != nil {
		return nil, err
	}

	NormalizeTransforms(transforms)
	if err := ValidateTransforms(transforms); err != nil {
		return nil, err
	}

	return transforms, nil
}

func NormalizeTransforms(transforms []Transform) {
	for index := range transforms {
		transforms[index].Name = strings.TrimSpace(transforms[index].Name)
		transforms[index].Quality = strings.ToLower(strings.TrimSpace(transforms[index].Quality))
	}
}

func ValidateTransforms(transforms []Transform) error {
	if len(transforms) == 0 {
		return errors.New("at least one requested transform is required")
	}

	for _, transform := range transforms {
		if strings.TrimSpace(transform.Name) == "" {
			return errors.New("each requested transform must include a name")
		}

		if transform.Width < 0 || transform.Height < 0 {
			return errors.New("transform dimensions must be zero or greater")
		}

		if transform.Width == 0 && transform.Height == 0 {
			return fmt.Errorf("transform %q must specify width or height", transform.Name)
		}

		switch transform.Quality {
		case "", "low", "balanced", "high":
		default:
			return errors.New("quality must be one of low, balanced, high when provided")
		}
	}

	return nil
}

func NormalizeFormat(format string) string {
	return strings.ToLower(strings.TrimSpace(format))
}

func ContentTypeForFormat(format string) (string, error) {
	switch NormalizeFormat(format) {
	case "jpg":
		return "image/jpeg", nil
	case "png":
		return "image/png", nil
	case "webp":
		return "image/webp", nil
	case "avif":
		return "image/avif", nil
	default:
		return "", fmt.Errorf("unsupported output format %q", format)
	}
}

func SanitizeVariantName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	if name == "" {
		return "variant"
	}

	var builder strings.Builder
	lastWasDash := false
	for _, r := range name {
		isAlphaNumeric := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if isAlphaNumeric {
			builder.WriteRune(r)
			lastWasDash = false
			continue
		}

		if !lastWasDash {
			builder.WriteByte('-')
			lastWasDash = true
		}
	}

	sanitized := strings.Trim(builder.String(), "-")
	if sanitized == "" {
		return "variant"
	}

	return sanitized
}

func (p *Processor) Generate(
	ctx context.Context,
	sourcePath string,
	outputDir string,
	format string,
	transforms []Transform,
) ([]GeneratedFile, error) {
	format = NormalizeFormat(format)
	contentType, err := ContentTypeForFormat(format)
	if err != nil {
		return nil, err
	}

	generated := make([]GeneratedFile, 0, len(transforms))
	usedNames := make(map[string]int)

	for _, transform := range transforms {
		variantName := uniqueVariantName(usedNames, SanitizeVariantName(transform.Name))
		outputPath := filepath.Join(outputDir, fmt.Sprintf("%s.%s", variantName, format))

		if err := runConvert(ctx, sourcePath, outputPath, format, transform); err != nil {
			return nil, fmt.Errorf("generate %s: %w", variantName, err)
		}

		stat, err := os.Stat(outputPath)
		if err != nil {
			return nil, err
		}

		generated = append(generated, GeneratedFile{
			ContentType: contentType,
			Path:        outputPath,
			SizeBytes:   stat.Size(),
			VariantName: variantName,
		})
	}

	return generated, nil
}

func runConvert(
	ctx context.Context,
	sourcePath string,
	outputPath string,
	format string,
	transform Transform,
) error {
	args := []string{sourcePath, "-auto-orient", "-strip"}

	if geometry := resizeGeometry(transform); geometry != "" {
		args = append(args, "-thumbnail", geometry)
	}

	if format == "jpg" {
		args = append(args, "-background", "white", "-alpha", "remove", "-alpha", "off")
	}

	args = append(args, "-quality", fmt.Sprintf("%d", qualityValue(transform.Quality)), outputPath)

	cmd := exec.CommandContext(ctx, "convert", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("convert command failed: %w: %s", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func resizeGeometry(transform Transform) string {
	switch {
	case transform.Width > 0 && transform.Height > 0:
		return fmt.Sprintf("%dx%d>", transform.Width, transform.Height)
	case transform.Width > 0:
		return fmt.Sprintf("%dx>", transform.Width)
	case transform.Height > 0:
		return fmt.Sprintf("x%d>", transform.Height)
	default:
		return ""
	}
}

func qualityValue(quality string) int {
	switch strings.ToLower(strings.TrimSpace(quality)) {
	case "low":
		return 60
	case "high":
		return 90
	default:
		return 75
	}
}

func uniqueVariantName(used map[string]int, base string) string {
	count := used[base]
	used[base] = count + 1

	if count == 0 {
		return base
	}

	return fmt.Sprintf("%s-%d", base, count+1)
}
