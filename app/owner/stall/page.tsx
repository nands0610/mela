"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ALLOWED_OWNER_EMAILS } from "@/lib/auth/allowlist";
import { ItemCard } from "./ItemCard";
import { ReviewCard } from "./ReviewCard";
import { LimitedOfferCard } from "./LimitedOfferCard";

const initialFormState = {
  name: "",
  // slug: "",
  category: "food",
  description: "",
  ownerName: "",
  ownerPhone: "",
  instagram: "",
  stallNumber: "",
  items: "",
  highlights: "",
  bestSellers: "",
  offers: "",
  availableAt: "",
  reviews: "",
  limitedTimeOffers: "",
  paymentMethods: "",
};

type MenuItem = { name: string; price: string };
type Review = { user: string; rating: number; comment: string };
type LimitedOffer = { title: string; description?: string; validTill?: string };
type StallPayload = typeof initialFormState & {
  bannerImage?: string;
  logoImage?: string;
  images?: string[];
  items?: MenuItem[];
  highlights?: string[];
  bestSellers?: string[];
  offers?: string[];
  availableAt?: string[];
  reviews?: Review[];
  limitedTimeOffers?: LimitedOffer[];
  paymentMethods?: string[];
};

type GalleryItem = {
  id: string;
  name: string;
  previewUrl: string;
  uploadedUrl?: string;
  status: "uploading" | "done" | "error";
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revokeIfBlob(url: string | null) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseItems(value: string) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, price] = line.split("-").map((part) => part.trim());
      if (!name || !price) return null;
      return { name, price };
    })
    .filter((item): item is { name: string; price: string } => item !== null);
}

function parseReviews(value: string) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [user, ratingText, comment] = line
        .split("-")
        .map((part) => part.trim());
      const rating = Number(ratingText);
      if (!user || Number.isNaN(rating)) return null;
      return {
        user,
        rating,
        comment: comment || "",
      };
    })
    .filter(
      (review): review is { user: string; rating: number; comment: string } =>
        review !== null
    );
}

function parseLimitedOffers(value: string) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, description, validTill] = line
        .split("-")
        .map((part) => part.trim());
      if (!title) return null;
      return {
        title,
        ...(description ? { description } : {}),
        ...(validTill ? { validTill } : {}),
      };
    })
    .filter(
      (offer): offer is { title: string; description?: string; validTill?: string } =>
        offer !== null
    );
}

async function uploadFile(file: File, folder: string, token: string) {
  const response = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-file-name": file.name,
        Authorization: `Bearer ${token}`,
      },
      body: file,
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || "Upload failed");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export default function StallOwnerPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialFormState);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([{ name: "", price: "" }]);
  // const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [stallSlug, setStallSlug] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerStatus, setBannerStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  // const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  // const [slugMessage, setSlugMessage] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const galleryItemsRef = useRef<GalleryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const MAX_GALLERY_IMAGES = 5;
  const [reviewsArr, setReviewsArr] = useState<Review[]>([
    { user: "", rating: 5, comment: "" },
  ]);

  const [limitedOffersArr, setLimitedOffersArr] = useState<LimitedOffer[]>([
    { title: "", description: "", validTill: "" },
  ]);

  const isUploading =
    bannerStatus === "uploading" ||
    logoStatus === "uploading" ||
    galleryItems.some((item) => item.status === "uploading");

  const bucketBases = [
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    process.env.NEXT_PUBLIC_R2_BUCKET_URL,
  ].filter(Boolean) as string[];
  const toMediaUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("/api/media")) return url;
    for (const base of bucketBases) {
      if (url.startsWith(base)) {
        const key = url.replace(base.replace(/\/+$/, "") + "/", "");
        return `/api/media?key=${encodeURIComponent(key)}`;
      }
    }
    return url;
  };

  const handleMenuItemChange = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, { name: "", price: "" }]);
  };

  const removeMenuItem = (index: number) => {
    setMenuItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const normalizeMenuItems = (items: MenuItem[]) =>
    items
      .map((i) => ({ name: i.name.trim(), price: i.price.trim() }))
      .filter((i) => i.name.length > 0 && i.price.length > 0);

  const handleReviewChange = (
    index: number,
    field: "user" | "rating" | "comment",
    value: string
  ) => {
    setReviewsArr((prev) => {
      const next = [...prev];
      if (field === "rating") {
        next[index] = { ...next[index], rating: Number(value) };
      } else {
        next[index] = { ...next[index], [field]: value } as Review;
      }
      return next;
    });
  };

  const addReview = () =>
    setReviewsArr((prev) => [...prev, { user: "", rating: 5, comment: "" }]);

  const removeReview = (index: number) =>
    setReviewsArr((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const normalizeReviews = (arr: Review[]) =>
    arr
      .map((r) => ({
        user: r.user.trim(),
        rating: Number(r.rating),
        comment: (r.comment ?? "").trim(),
      }))
      .filter((r) => r.user && Number.isFinite(r.rating) && r.rating >= 0 && r.rating <= 5);

  const handleOfferChange = (
    index: number,
    field: "title" | "description" | "validTill",
    value: string
  ) => {
    setLimitedOffersArr((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addOffer = () =>
    setLimitedOffersArr((prev) => [...prev, { title: "", description: "", validTill: "" }]);

  const removeOffer = (index: number) =>
    setLimitedOffersArr((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const normalizeOffers = (arr: LimitedOffer[]) =>
    arr
      .map((o) => ({
        title: o.title.trim(),
        description: o.description?.trim() || undefined,
        validTill: o.validTill?.trim() || undefined,
      }))
      .filter((o) => o.title.length > 0);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email?.toLowerCase() ?? null;

        if (!email) {
          setStatusMessage("Please sign in to manage your stall.");
          setIsLoading(false);
          return;
        }

        setOwnerEmail(email);
        const response = await fetch("/api/stalls", {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        });

        if (response.status === 403) {
          // Email not in allowlist
          await supabase.auth.signOut();
          setStatusMessage("For that you have to put a stall. See you next year bye bye 👋");
          setOwnerEmail(null);
          setIsLoading(false);
          return;
        }

        if (response.ok) {
          const result = await response.json();
          setStallSlug(result.submission?.stall_slug ?? null);
          const payload = result.submission?.payload as StallPayload | undefined;

          if (payload) {
            const itemsValue = Array.isArray(payload.items) ? payload.items : [];
            const highlightsValue = Array.isArray(payload.highlights)
              ? payload.highlights
              : [];
            const bestSellersValue = Array.isArray(payload.bestSellers)
              ? payload.bestSellers
              : [];
            const offersValue = Array.isArray(payload.offers)
              ? payload.offers
              : [];
            const availableAtValue = Array.isArray(payload.availableAt)
              ? payload.availableAt
              : [];
            const reviewsValue = Array.isArray(payload.reviews)
              ? payload.reviews
              : [];
            const limitedTimeOffersValue = Array.isArray(payload.limitedTimeOffers)
              ? payload.limitedTimeOffers
              : [];
            const paymentMethodsValue = Array.isArray(payload.paymentMethods)
              ? payload.paymentMethods
              : [];
            setFormValues({
              ...initialFormState,
              name: payload.name ?? "",
              // slug: payload.slug ?? "",
              category: payload.category ?? "food",
              description: payload.description ?? "",
              ownerName: payload.ownerName ?? "",
              ownerPhone: payload.ownerPhone ?? "",
              instagram: payload.instagram ?? "",
              stallNumber: payload.stallNumber ?? "",
              // items: itemsValue
              //   .map((item) => `${item.name} - ${item.price}`)
              //   .join("\n"),
              highlights: highlightsValue.join(", "),
              bestSellers: bestSellersValue.join(", "),
              offers: offersValue.join(", "),
              availableAt: availableAtValue.join(", "),
              reviews: reviewsValue
                .map(
                  (review) =>
                    `${review.user} - ${review.rating} - ${review.comment}`
                )
                .join("\n"),
              limitedTimeOffers: limitedTimeOffersValue
                .map(
                  (offer) =>
                    `${offer.title} - ${offer.description ?? ""} - ${
                      offer.validTill ?? ""
                    }`
                )
                .join("\n"),
              paymentMethods: paymentMethodsValue.join(", "),
            });

            setMenuItems(itemsValue.length ? itemsValue : [{ name: "", price: "" }]);

            setReviewsArr(
              reviewsValue.length ? reviewsValue : [{ user: "", rating: 5, comment: "" }]
            );

            setLimitedOffersArr(
              limitedTimeOffersValue.length ? limitedTimeOffersValue : [{ title: "", description: "", validTill: "" }]
            );

            // if (payload.slug) {
            //   setOriginalSlug(payload.slug.trim().toLowerCase());
            // }

            if (payload.bannerImage) setBannerUrl(payload.bannerImage);
            if (payload.logoImage) setLogoUrl(payload.logoImage);
            if (payload.images?.length) {
              setGalleryItems(
                payload.images.map((url) => ({
                  id: createId(),
                  name: url.split("/").pop() ?? "image",
                  previewUrl: url,
                  uploadedUrl: url,
                  status: "done",
                }))
              );
            }
          }
        }
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Failed to load session."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, []);

  useEffect(() => {
    return () => {
      revokeIfBlob(bannerPreview);
    };
  }, [bannerPreview]);

  useEffect(() => {
    return () => {
      revokeIfBlob(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  useEffect(() => {
    return () => {
      galleryItemsRef.current.forEach((item) => revokeIfBlob(item.previewUrl));
    };
  }, []);

  // useEffect(() => {
  //   const nextSlug = formValues.slug.trim().toLowerCase();
  //   if (!nextSlug) {
  //     setSlugStatus("idle");
  //     setSlugMessage(null);
  //     return;
  //   }

  //   if (originalSlug && nextSlug === originalSlug) {
  //     setSlugStatus("available");
  //     setSlugMessage(null);
  //     return;
  //   }

  //   setSlugStatus("checking");
  //   setSlugMessage(null);
  //   let isActive = true;
  //   const timer = setTimeout(async () => {
  //     try {
  //       const response = await fetch(`/api/public/stalls/${encodeURIComponent(nextSlug)}`);
  //       if (!response.ok) {
  //         throw new Error("Failed to validate slug");
  //       }
  //       const data = await response.json();
  //       if (!isActive) return;
  //       if (data?.stall) {
  //         setSlugStatus("taken");
  //         setSlugMessage("Short link already taken.");
  //       } else {
  //         setSlugStatus("available");
  //         setSlugMessage(null);
  //       }
  //     } catch {
  //       if (!isActive) return;
  //       setSlugStatus("idle");
  //       setSlugMessage(null);
  //     }
  //   }, 400);

  //   return () => {
  //     isActive = false;
  //     clearTimeout(timer);
  //   };
  // }, [formValues.slug, originalSlug]);

  const getAccessToken = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBannerChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (bannerPreview) {
      revokeIfBlob(bannerPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setBannerPreview(previewUrl);
    setBannerStatus("uploading");

    try {
      const token = await getAccessToken();
      if (!token) {
        setBannerStatus("error");
        setStatusMessage("Please sign in before uploading images.");
        return;
      }

      const url = await uploadFile(file, "banners", token);
      setBannerUrl(url);
      setBannerStatus("done");
    } catch (error) {
      setBannerStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to upload banner image."
      );
    }
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (logoPreview) {
      revokeIfBlob(logoPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setLogoStatus("uploading");

    try {
      const token = await getAccessToken();
      if (!token) {
        setLogoStatus("error");
        setStatusMessage("Please sign in before uploading images.");
        return;
      }

      const url = await uploadFile(file, "logos", token);
      setLogoUrl(url);
      setLogoStatus("done");
    } catch (error) {
      setLogoStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to upload logo image."
      );
    }
  };

  const handleRemoveBanner = () => {
    if (bannerPreview) {
      revokeIfBlob(bannerPreview);
    }
    setBannerPreview(null);
    setBannerUrl(null);
    setBannerStatus("idle");
  };

  const handleRemoveLogo = () => {
    if (logoPreview) {
      revokeIfBlob(logoPreview);
    }
    setLogoPreview(null);
    setLogoUrl(null);
    setLogoStatus("idle");
  };

  const updateGalleryItem = (id: string, patch: Partial<GalleryItem>) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleGalleryChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    const remainingSlots = MAX_GALLERY_IMAGES - galleryItems.length;

    if (remainingSlots <= 0) {
      setStatusMessage(`You can upload a maximum of ${MAX_GALLERY_IMAGES} images.`);
      event.target.value = ""; // allow re-selecting same file later
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setStatusMessage(
        `Only ${remainingSlots} more image(s) allowed. Extra files were ignored.`
      );
    }

    const token = await getAccessToken();
    if (!token) {
      setStatusMessage("Please sign in before uploading images.");
      event.target.value = "";
      return;
    }

    const newItems = filesToUpload.map((file) => ({
      id: createId(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    setGalleryItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item, index) => {
        try {
          const url = await uploadFile(filesToUpload[index], "gallery", token);
          updateGalleryItem(item.id, { uploadedUrl: url, status: "done" });
        } catch {
          updateGalleryItem(item.id, { status: "error" });
        }
      })
    );

    event.target.value = "";
  };

  const handleRemoveGalleryItem = (id: string) => {
    setGalleryItems((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item) revokeIfBlob(item.previewUrl);
      return prev.filter((entry) => entry.id !== id);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      // if (slugStatus === "taken") {
      //   setStatusMessage("Short link already taken. Choose another.");
      //   setIsSubmitting(false);
      //   return;
      // }

      if (!bannerUrl) {
        setStatusMessage("Please upload a banner image before saving.");
        setIsSubmitting(false);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        setStatusMessage("Please sign in before submitting details.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: formValues.name.trim(),
        // slug: formValues.slug.trim(),
        category: formValues.category,
        description: formValues.description.trim(),
        bannerImage: bannerUrl ?? "",
        logoImage: logoUrl ?? undefined,
        images: galleryItems
          .map((item) => item.uploadedUrl)
          .filter((url): url is string => Boolean(url)),
        ownerName: formValues.ownerName.trim(),
        ownerPhone: formValues.ownerPhone.trim(),
        instagram: formValues.instagram.trim() || undefined,
        items: normalizeMenuItems(menuItems),
        highlights: parseCsv(formValues.highlights),
        bestSellers: parseCsv(formValues.bestSellers),
        offers: parseCsv(formValues.offers),
        availableAt: parseCsv(formValues.availableAt),
        stallNumber: formValues.stallNumber.trim() || undefined,
        paymentMethods: parseCsv(formValues.paymentMethods),
        reviews: normalizeReviews(reviewsArr),
        limitedTimeOffers: normalizeOffers(limitedOffersArr),
      };

      const response = await fetch("/api/stalls", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setStatusMessage(errorBody?.error || "Failed to save details.");
        return;
      }

      const result = await response.json();
      setStallSlug(result?.submission?.stall_slug ?? null);
      setStatusMessage("Saved! You can update this anytime.");
    } catch (error) { 
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setStatusMessage(null);
    if (!window.confirm("Delete your current stall submission?")) return;

    try {
      const token = await getAccessToken();
      if (!token) {
        setStatusMessage("Please sign in before deleting.");
        return;
      }

      const response = await fetch("/api/stalls", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setStatusMessage(errorBody?.error || "Failed to delete submission.");
        return;
      }

      setStatusMessage("Submission deleted.");
      setFormValues(initialFormState);
      setMenuItems([{ name: "", price: "" }]);
      setBannerUrl(null);
      setLogoUrl(null);
      setGalleryItems([]);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to delete submission."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-600">
        Loading...
      </div>
    );
  }

  if (!ownerEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Please sign in to continue
        </h1>
        {statusMessage && (
          <p className={`max-w-md text-sm ${
            statusMessage.includes("bye bye")
              ? "text-orange-600 font-medium"
              : "text-neutral-600"
          }`}>{statusMessage}</p>
        )}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
            Stall Owner Dashboard
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">
            Manage your stall details
          </h1>
          <p className="text-sm text-neutral-600">Signed in as {ownerEmail}</p>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-md shadow-orange-400/50 transition hover:border-orange-200"
          >
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
              {logoPreview || logoUrl ? (
                <img
                  src={toMediaUrl(logoPreview ?? logoUrl) ?? ""}
                  alt="Stall logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-400">
                  Logo
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-sm text-neutral-500">Owner</span>
              <span className="text-lg font-semibold text-neutral-900">
                {formValues.ownerName || "Add owner name"}
              </span>
              <span className="text-sm text-neutral-500">
                {formValues.name || "Add stall name"}
              </span>
            </div>
            <span className="text-sm font-semibold text-orange-600">
              {showDetails ? "Hide details" : "Edit details"}
            </span>
          </button>
        </div>

        {stallSlug && (
          <div className="mt-4">
            <label className="text-sm font-medium text-orange-700">Your short link</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={`${process.env.NEXT_PUBLIC_SHORT_DOMAIN}/${stallSlug}`}
                readOnly
                className="w-full rounded-xl border border-orange-400 px-4 py-3 text-sm bg-neutral-50 text-neutral-900"
              />
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${process.env.NEXT_PUBLIC_SHORT_DOMAIN}/${stallSlug}`
                  )
                }
                className="shrink-0 rounded-xl border border-orange-300 bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:border-orange-400 hover:bg-orange-100"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              This link is generated automatically from your stall name. The first time you save, it will be set and cannot be changed. Make sure you're happy with it!
            </p>
          </div>
        )}

        {showDetails && (
          <form
            className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            onSubmit={handleSubmit}
          >
            <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-md shadow-orange-400/50">
              <h2 className="text-xl font-semibold text-neutral-900">Stall info</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="name">
                    Stall name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={formValues.name}
                    onChange={handleInputChange}
                    placeholder="Spicy Bites"
                    className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 text-neutral-900"
                  />
                </div>
                {/* <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="slug">
                    Short link *
                  </label>
                  <input
                    id="slug"
                    name="slug"
                    value={formValues.slug}
                    onChange={handleInputChange}
                    placeholder="spicy-bites"
                    className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 text-neutral-900"
                  />
                  <small className="mt-2 block text-xs text-neutral-500">
                    This becomes the web address for your stall (letters, numbers, and dashes only).
                  </small>
                  <p className={`mt-2 text-xs ${
                    slugStatus === "taken"
                      ? "text-red-600"
                      : slugStatus === "checking"
                        ? "text-neutral-400"
                        : "text-neutral-500"
                  }`}>
                    {slugStatus === "checking"
                      ? "Checking availability..."
                      : slugMessage ?? "Keep it short and unique."}
                  </p>
                </div> */}
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="category">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formValues.category}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="food">Food</option>
                    <option value="accessories">Accessories</option>
                    <option value="games">Games</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="stallNumber">
                    Stall number
                  </label>
                  <input
                    id="stallNumber"
                    name="stallNumber"
                    value={formValues.stallNumber}
                    onChange={handleInputChange}
                    placeholder="F-04"
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label
                  className="text-sm font-medium text-orange-700"
                  htmlFor="description"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Tell visitors what makes your stall special."
                  className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-md shadow-orange-400/50">
              <h2 className="text-xl font-semibold text-neutral-900">Owner details</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="ownerName">
                    Owner name *
                  </label>
                  <input
                    id="ownerName"
                    name="ownerName"
                    value={formValues.ownerName}
                    onChange={handleInputChange}
                    placeholder="Rajesh Kumar"
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="ownerPhone">
                    Owner phone *
                  </label>
                  <input
                    id="ownerPhone"
                    name="ownerPhone"
                    value={formValues.ownerPhone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="instagram">
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    name="instagram"
                    value={formValues.instagram}
                    onChange={handleInputChange}
                    placeholder="@spicybites_official"
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-orange-700" htmlFor="paymentMethods">
                    Payment methods (modes only)
                  </label>
                  <input
                    id="paymentMethods"
                    name="paymentMethods"
                    value={formValues.paymentMethods}
                    onChange={handleInputChange}
                    placeholder="UPI, Cash, GPay"
                    className="mt-2 w-full rounded-xl text-neutral-900 border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-md shadow-orange-400/50">
              <h2 className="text-xl font-semibold text-neutral-900">Menu and extras</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-orange-700">
                      Items
                    </label>

                    <button
                      type="button"
                      onClick={addMenuItem}
                      className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                    >
                      + Add item
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {menuItems.map((item, index) => (
                      <ItemCard
                        key={index}
                        item={item}
                        index={index}
                        onChange={handleMenuItemChange}
                        onRemove={removeMenuItem}
                        canRemove={menuItems.length > 1}
                      />
                    ))}
                  </div>

                  <p className="mt-2 text-xs text-neutral-500">
                    Add one item per row. No formatting needed.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-orange-700" htmlFor="highlights">
                      Highlights
                    </label>
                    <textarea
                      id="highlights"
                      name="highlights"
                      value={formValues.highlights}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Comma-separated highlights"
                      className="mt-2 w-full text-neutral-900 rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-orange-700" htmlFor="bestSellers">
                      Best sellers
                    </label>
                    <textarea
                      id="bestSellers"
                      name="bestSellers"
                      value={formValues.bestSellers}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Comma-separated items"
                      className="mt-2 w-full text-neutral-900 rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-orange-700" htmlFor="offers">
                      Offers
                    </label>
                    <textarea
                      id="offers"
                      name="offers"
                      value={formValues.offers}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Comma-separated offers"
                      className="mt-2 w-full text-neutral-900 rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-orange-700" htmlFor="availableAt">
                      Available at
                    </label>
                    <textarea
                      id="availableAt"
                      name="availableAt"
                      value={formValues.availableAt}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Events or locations"
                      className="mt-2 w-full text-neutral-900 rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-orange-700">Reviews</label>

                    <button
                      type="button"
                      onClick={addReview}
                      className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-orange-400 hover:text-orange-700"
                    >
                      + Add review
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {reviewsArr.map((review, index) => (
                      <ReviewCard
                        key={index}
                        review={review}
                        index={index}
                        onChange={handleReviewChange}
                        onRemove={removeReview}
                        canRemove={reviewsArr.length > 1}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-orange-700">Limited time offers</label>

                    <button
                      type="button"
                      onClick={addOffer}
                      className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                    >
                      + Add offer
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {limitedOffersArr.map((offer, index) => (
                      <LimitedOfferCard
                        key={index}
                        offer={offer}
                        index={index}
                        onChange={handleOfferChange}
                        onRemove={removeOffer}
                        canRemove={limitedOffersArr.length > 1}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-md shadow-orange-400/50">
              <h2 className="text-xl font-semibold text-neutral-900">Images</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="bannerUpload">
                    Banner image *
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <label
                      htmlFor="bannerUpload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                    >
                      Choose file
                    </label>
                    <span className="text-xs text-neutral-500">
                      {bannerUrl ? "Uploaded" : "No file selected"}
                    </span>
                  </div>
                  <input
                    id="bannerUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="sr-only"
                  />
                  {(bannerPreview || bannerUrl) && (
                    <div className="relative mt-3 overflow-hidden rounded-2xl border border-neutral-200">
                      <img
                        src={toMediaUrl(bannerPreview ?? bannerUrl) ?? ""}
                        alt="Banner preview"
                        className="h-48 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-white"
                        aria-label="Remove banner image"
                        title="Remove banner"
                      >
                        x
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    Status: {bannerStatus === "idle" ? "Not uploaded" : bannerStatus}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="logoUpload">
                    Logo image
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <label
                      htmlFor="logoUpload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                    >
                      Choose file
                    </label>
                    <span className="text-xs text-neutral-500">
                      {logoUrl ? "Uploaded" : "No file selected"}
                    </span>
                  </div>
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="sr-only"
                  />
                  {(logoPreview || logoUrl) && (
                    <div className="relative mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <img
                        src={toMediaUrl(logoPreview ?? logoUrl) ?? ""}
                        alt="Logo preview"
                        className="h-24 w-24 rounded-2xl object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-white"
                        aria-label="Remove logo image"
                        title="Remove logo"
                      >
                        x
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    Status: {logoStatus === "idle" ? "Not uploaded" : logoStatus}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="galleryUpload">
                    Gallery images
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <label
                      htmlFor="galleryUpload"
                      className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold shadow-sm transition
                        ${galleryItems.length >= MAX_GALLERY_IMAGES
                          ? "cursor-not-allowed border-neutral-200 text-neutral-400 opacity-60"
                          : "cursor-pointer border-neutral-200 text-neutral-700 hover:border-orange-300 hover:text-orange-600"}
                      `}
                    >
                      Choose files
                    </label>
                    <span className="text-xs text-neutral-500">
                      {galleryItems.length}/{MAX_GALLERY_IMAGES} selected
                    </span>
                  </div>
                  <input
                    id="galleryUpload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    disabled={galleryItems.length >= MAX_GALLERY_IMAGES}
                    className="sr-only"
                  />
                  {galleryItems.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {galleryItems.map((item) => (
                        <div
                          key={item.id}
                          className="relative overflow-hidden rounded-xl border border-neutral-200"
                        >
                          <img
                            src={
                              toMediaUrl(item.uploadedUrl ?? item.previewUrl) ??
                              item.previewUrl
                            }
                            alt={item.name}
                            className="h-24 w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 transition hover:opacity-100" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryItem(item.id)}
                            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-white"
                            aria-label={`Remove ${item.name}`}
                            title="Remove image"
                          >
                            x
                          </button>
                          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-700">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-md shadow-orange-400/50">
              <h2 className="text-xl font-semibold text-neutral-900">Actions</h2>
              <div className="mt-4 space-y-3">
                <button
                  type="submit"
                  // disabled={isSubmitting || isUploading || slugStatus === "taken" || slugStatus === "checking"}
                  disabled={isSubmitting || isUploading}
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(255,140,0,0.3)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : "Save stall details"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full rounded-xl border border-orange-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:border-neutral-300"
                >
                  Delete submission
                </button>
              </div>
              {statusMessage && (
                <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  statusMessage.includes("bye bye")
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-neutral-100 bg-neutral-50 text-neutral-700"
                }`}>
                  {statusMessage}
                </p>
              )}
            </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
