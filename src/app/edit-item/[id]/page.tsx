"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { expirationRecordsService } from "@/lib/db";
import type { ExpirationRecord } from "@/types";

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<ExpirationRecord | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      const record = await expirationRecordsService.getById(id);
      if (!record) {
        router.push("/");
        return;
      }

      setItem(record);
      setQuantity(record.quantity);
      setExpirationDate(
        record.expirationDate.toISOString().split("T")[0]
      );
    };

    loadItem();
  }, [id, router]);

  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    try {
      await expirationRecordsService.update(id, {
        quantity,
        expirationDate: new Date(expirationDate),
      });

      router.push(`/item/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href={`/item/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Edit Item</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{item.itemName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="text-sm text-gray-600">Quantity</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="text-sm text-gray-600">Expiration Date</label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
