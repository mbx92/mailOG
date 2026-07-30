CREATE TYPE "public"."status_aktif" AS ENUM('aktif', 'nonaktif');--> statement-breakpoint
CREATE TYPE "public"."surat_masuk_status" AS ENUM('baru', 'diproses', 'disposisi', 'selesai', 'arsip');--> statement-breakpoint
CREATE TYPE "public"."kertas" AS ENUM('a4', 'folio', 'legal');--> statement-breakpoint
CREATE TYPE "public"."surat_keluar_status" AS ENUM('draft', 'menunggu_approval', 'disetujui', 'ditolak', 'dikirim', 'arsip');--> statement-breakpoint
CREATE TYPE "public"."lampiran_jenis" AS ENUM('masuk', 'keluar');--> statement-breakpoint
CREATE TYPE "public"."disposisi_status" AS ENUM('diterima', 'diproses', 'selesai', 'diteruskan');--> statement-breakpoint
CREATE TYPE "public"."notifikasi_tipe" AS ENUM('info', 'disposisi', 'approval', 'system');--> statement-breakpoint
CREATE TABLE "instansi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"alamat" text,
	"logo" varchar(255),
	"kontak" varchar(100),
	"status" "status_aktif" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "instansi_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instansi_id" uuid NOT NULL,
	"parent_unit_id" uuid,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"kepala_unit_id" uuid,
	"status" "status_aktif" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid,
	"nama" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"level" smallint DEFAULT 4 NOT NULL,
	"jabatan" varchar(100),
	"no_telp" varchar(20),
	"avatar" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "klasifikasi_surat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" varchar(100) NOT NULL,
	"warna" varchar(7) DEFAULT '#5f5f5f' NOT NULL,
	"urutan" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surat_masuk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomor_surat" varchar(100) NOT NULL,
	"perihal" varchar(255) NOT NULL,
	"isi_ringkasan" text,
	"asal_instansi_id" uuid,
	"asal_unit_id" uuid,
	"pengirim" varchar(255),
	"tanggal_surat" date NOT NULL,
	"tanggal_diterima" date NOT NULL,
	"tujuan_unit_id" uuid,
	"klasifikasi_id" uuid,
	"status" "surat_masuk_status" DEFAULT 'baru' NOT NULL,
	"catatan_internal" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "surat_keluar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomor_surat" varchar(100),
	"perihal" varchar(255) NOT NULL,
	"isi_surat" text,
	"tujuan_instansi_id" uuid,
	"tujuan_unit_id" uuid,
	"penerima" varchar(255),
	"penerima_jabatan" varchar(100),
	"penerima_alamat" text,
	"template_id" uuid,
	"tanggal_surat" date,
	"unit_id" uuid,
	"klasifikasi_id" uuid,
	"status" "surat_keluar_status" DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"catatan_internal" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "template_surat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" varchar(255) NOT NULL,
	"kode" varchar(50) NOT NULL,
	"kop_surat" text,
	"body_template" text,
	"footer" text,
	"kertas" "kertas" DEFAULT 'a4' NOT NULL,
	"margin" jsonb,
	"unit_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "template_surat_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "lampiran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surat_id" uuid NOT NULL,
	"jenis" "lampiran_jenis" NOT NULL,
	"nama_file" varchar(255) NOT NULL,
	"path" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disposisi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surat_id" uuid NOT NULL,
	"dari_user_id" uuid NOT NULL,
	"ke_user_id" uuid,
	"ke_unit_id" uuid,
	"instruksi" text,
	"batas_waktu" date,
	"status" "disposisi_status" DEFAULT 'diterima' NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surat_id" uuid,
	"user_id" uuid,
	"aksi" varchar(50) NOT NULL,
	"detail" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifikasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"surat_id" uuid,
	"judul" varchar(255) NOT NULL,
	"pesan" text,
	"tipe" "notifikasi_tipe" DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomor_counter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_kode" varchar(20) NOT NULL,
	"tahun" smallint NOT NULL,
	"bulan" smallint NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_instansi_id_instansi_id_fk" FOREIGN KEY ("instansi_id") REFERENCES "public"."instansi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_asal_instansi_id_instansi_id_fk" FOREIGN KEY ("asal_instansi_id") REFERENCES "public"."instansi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_asal_unit_id_unit_id_fk" FOREIGN KEY ("asal_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_tujuan_unit_id_unit_id_fk" FOREIGN KEY ("tujuan_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_klasifikasi_id_klasifikasi_surat_id_fk" FOREIGN KEY ("klasifikasi_id") REFERENCES "public"."klasifikasi_surat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_tujuan_instansi_id_instansi_id_fk" FOREIGN KEY ("tujuan_instansi_id") REFERENCES "public"."instansi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_tujuan_unit_id_unit_id_fk" FOREIGN KEY ("tujuan_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_template_id_template_surat_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template_surat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_klasifikasi_id_klasifikasi_surat_id_fk" FOREIGN KEY ("klasifikasi_id") REFERENCES "public"."klasifikasi_surat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_surat" ADD CONSTRAINT "template_surat_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lampiran" ADD CONSTRAINT "lampiran_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_surat_id_surat_masuk_id_fk" FOREIGN KEY ("surat_id") REFERENCES "public"."surat_masuk"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_dari_user_id_users_id_fk" FOREIGN KEY ("dari_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_ke_user_id_users_id_fk" FOREIGN KEY ("ke_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_ke_unit_id_unit_id_fk" FOREIGN KEY ("ke_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_log" ADD CONSTRAINT "tracking_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unit_instansi_kode_idx" ON "unit" USING btree ("instansi_id","kode");--> statement-breakpoint
CREATE INDEX "tracking_log_created_at_idx" ON "tracking_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nomor_counter_unit_period_idx" ON "nomor_counter" USING btree ("unit_kode","tahun","bulan");