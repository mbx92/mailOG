# Uploads (penyimpanan lokal)

Default storage MailOG: **local** (`STORAGE_DRIVER=local`).

## Folder

- Lampiran baru: `uploads/surat/<INSTANSI>/<YYYY>/<MM>/<uuid>.ext`
- File legacy (migrasi): salin ke `uploads/surat/<nama-file>` (flat)

## Env

```
STORAGE_DRIVER=local
UPLOAD_DIR=uploads/surat
```

Untuk MinIO: `STORAGE_DRIVER=minio` (+ kredensial MINIO_*).
Jika MinIO gagal saat upload/baca, sistem mencoba fallback ke folder lokal.
