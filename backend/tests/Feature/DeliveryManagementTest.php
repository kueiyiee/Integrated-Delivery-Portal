<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Services\Delivery\DeliveryService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DeliveryManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'sqlite']);
        config(['database.connections.sqlite' => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]]);

        DB::purge();

        Schema::create('deliveries', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('uuid')->unique();
            $table->string('tracking_number')->unique();
            $table->string('external_reference')->nullable();
            $table->string('status')->default('pending');
            $table->json('pickup_address')->nullable();
            $table->json('dropoff_address')->nullable();
            $table->json('status_history')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('deliveries');

        parent::tearDown();
    }

    public function test_delivery_service_can_create_update_and_cancel_a_delivery_with_history(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-001',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Fragile',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $this->assertSame('pending', $delivery->status);
        $this->assertMatchesRegularExpression('/^DPL-\d{6}-[A-Z0-9]{8}$/', $delivery->tracking_number);
        $this->assertSame('Warehouse', $delivery->pickup_address['line1']);
        $this->assertCount(1, $delivery->status_history);

        $updated = $service->update($delivery->id, [
            'status' => 'in_transit',
            'notes' => 'Departed warehouse',
        ]);

        $this->assertSame('in_transit', $updated->status);
        $this->assertSame('Departed warehouse', $updated->notes);
        $this->assertCount(2, $updated->status_history);

        $cancelled = $service->cancel($delivery->id, [
            'cancel_reason' => 'Customer unavailable',
        ]);

        $this->assertSame('cancelled', $cancelled->status);
        $this->assertNotNull($cancelled->cancelled_at);
        $this->assertSame('Customer unavailable', $cancelled->cancel_reason);
        $this->assertCount(3, $cancelled->status_history);
    }

    public function test_delivery_service_rejects_direct_pending_to_picked_up_transition(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-002',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Standard package',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $service->update($delivery->id, ['status' => 'picked_up']);
    }

    public function test_delivery_service_uses_generated_tracking_number_and_blocks_client_override(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'tracking_number' => 'TRK-OVERRIDE',
            'external_reference' => 'ORD-007',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Generated tracking reference',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $this->assertSame('ORD-007', $delivery->external_reference);
        $this->assertSame('pending', $delivery->status);
        $this->assertMatchesRegularExpression('/^DPL-\d{6}-[A-Z0-9]{8}$/', $delivery->tracking_number);
        $this->assertNotSame('TRK-OVERRIDE', $delivery->tracking_number);

        $this->expectException(\InvalidArgumentException::class);
        $service->update($delivery->id, ['tracking_number' => 'TRK-CHANGED']);
    }

    public function test_delivery_service_rejects_cancelled_to_delivered_transition(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-003',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Return package',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $service->cancel($delivery->id, ['cancel_reason' => 'Customer cancelled']);

        $this->expectException(\InvalidArgumentException::class);
        $service->update($delivery->id, ['status' => 'delivered']);
    }

    public function test_delivery_service_rejects_picked_up_to_pending_transition(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-004',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Return package',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $service->update($delivery->id, ['status' => 'in_transit']);
        $service->update($delivery->id, ['status' => 'picked_up']);

        $this->expectException(\InvalidArgumentException::class);
        $service->update($delivery->id, ['status' => 'pending']);
    }

    public function test_delivery_service_can_transition_to_failed_after_in_transit(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-005',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Standard package',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $service->update($delivery->id, ['status' => 'in_transit']);
        $failed = $service->update($delivery->id, ['status' => 'failed']);

        $this->assertSame('failed', $failed->status);
        $this->assertCount(3, $failed->status_history);
    }

    public function test_delivery_service_can_delete_a_delivery(): void
    {
        $service = new DeliveryService();

        $delivery = $service->create([
            'company_id' => 42,
            'external_reference' => 'ORD-006',
            'pickup_address' => ['line1' => 'Warehouse', 'city' => 'Seattle'],
            'dropoff_address' => ['line1' => 'Customer', 'city' => 'Portland'],
            'notes' => 'Standard package',
            'scheduled_at' => '2026-07-27 10:00:00',
        ]);

        $service->delete($delivery->id);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        Delivery::findOrFail($delivery->id);
    }
}
