<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('report_exports')) {
            return;
        }

        Schema::table('report_exports', function (Blueprint $table) {
            if (! Schema::hasColumn('report_exports', 'file_path')) {
                $table->string('file_path')->nullable()->after('checksum');
            }

            if (! Schema::hasColumn('report_exports', 'mime_type')) {
                $table->string('mime_type', 100)->nullable()->after('file_path');
            }

            if (! Schema::hasColumn('report_exports', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('mime_type');
            }

            if (! Schema::hasColumn('report_exports', 'storage_disk')) {
                $table->string('storage_disk', 32)->default('local')->after('file_size');
            }

            if (! Schema::hasIndex('report_exports', 'report_exports_company_id_index')) {
                $table->index('company_id');
            }

            if (! Schema::hasIndex('report_exports', 'report_exports_generated_by_index')) {
                $table->index('generated_by');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('report_exports')) {
            return;
        }

        Schema::table('report_exports', function (Blueprint $table) {
            if (Schema::hasColumn('report_exports', 'file_path')) {
                $table->dropColumn('file_path');
            }
            if (Schema::hasColumn('report_exports', 'mime_type')) {
                $table->dropColumn('mime_type');
            }
            if (Schema::hasColumn('report_exports', 'file_size')) {
                $table->dropColumn('file_size');
            }
            if (Schema::hasColumn('report_exports', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
        });
    }
};
