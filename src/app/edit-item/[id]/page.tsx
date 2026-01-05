"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { expirationRecordsService } from "@/lib/db";
import type { ExpirationRecord } from "@/types";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ExpirationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    expirationRecordsService.getById(id).then((data) => {
      setItem(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <p className="p-4 text-center">Loading...</p>;
  }

  if (!item) {
    return <p className="p-4 text-center text-red-600">Item not found</p>;
  }

  const save = async () => {
    await expirationRecordsService.update(item.id, {
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      expirationDate: item.expirationDate,
    });

    router.push("/");
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={item.itemName}
            onChange={(e) =>
              setItem({ ...item, itemName: e.target.value })
            }
            placeholder="Item name"
          />

          <Input
            value={item.description}
            onChange={(e) =>
              setItem({ ...item, description: e.target.value })
            }
            placeholder="Description"
          />

          <Input
            type="number"
            value={item.quantity}
            onChange={(e) =>
              setItem({ ...item, quantity: Number(e.target.value) })
            }
            placeholder="Quantity"
          />

          <Input
            type="date"
            value={item.expirationDate.toISOString().split("T")[0]}
            onChange={(e) =>
              setItem({
                ...item,
                expirationDate: new Date(e.target.value),
              })
            }
          />

          <Button className="w-full" onClick={save}>
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
