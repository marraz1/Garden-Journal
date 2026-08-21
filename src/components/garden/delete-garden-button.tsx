"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deleteGarden } from "@/actions/gardens";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteGardenButton({ gardenId }: { gardenId: string }) {
  const t = useTranslations("garden");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteGarden(gardenId);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="touch" className="self-start">
          <Trash2 className="size-4" aria-hidden />
          {tc("delete")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc("delete")}</DialogTitle>
          {/* Deleting cascades to beds, plants, tasks and journal entries. */}
          <DialogDescription>{t("deleteConfirm")}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="touch">
              {tc("cancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" size="touch" disabled={pending} onClick={confirmDelete}>
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
