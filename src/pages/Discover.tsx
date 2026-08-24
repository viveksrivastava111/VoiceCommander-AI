import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Mic,
  ChevronDown,
} from "lucide-react";

import { useProductStore } from "../store/useProductStore";
import ProductCard from "../components/ProductCard";

type SidebarCategory = {
  label: string;
  category: string;
  subcategories?: string[];
};

const sidebarCategories: SidebarCategory[] = [
  {
    label: "All Categories",
    category: "All",
  },
  {
    label: "Fruits & Vegetables",
    category: "Produce",
  },
  {
    label: "Dairy & Eggs",
    category: "Dairy",
  },
  {
    label: "Beverages",
    category: "Beverages",
  },
  {
    label: "Snacks & Munchies",
    category: "Snacks",
  },
  {
    label: "Breakfast & Cereals",
    category: "Bakery",
  },
  {
    label: "Staples",
    category: "Pantry",
  },
  {
    label: "Personal Care",
    category: "Personal Care",
  },
  {
    label: "Home Care",
    category: "Household",
  },
  {
    label: "Baby Care",
    category: "Other",
    subcategories: [
      "Baby Food",
      "Diapers",
      "Baby Hygiene",
    ],
  },
  {
    label: "Pet Care",
    category: "Other",
    subcategories: [
      "Dog Food",
      "Cat Food",
    ],
  },
];

export default function Discover() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const products = useProductStore(
    (state) => state.products
  );

  const [rawCategory, setRawCategory] =
    useState<string>("All Categories");

  const [subcategory, setSubcategory] =
    useState<string>("");

  const [search, setSearch] =
    useState<string>("");

  const [sort, setSort] =
    useState<string>("featured");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");

    const category =
      searchParams.get("category");

    const match =
      sidebarCategories.find(
        (item) =>
          item.label === category
      );

    setRawCategory(
      match
        ? match.label
        : "All Categories"
    );

    setSubcategory("");
  }, [searchParams]);

  const selected = useMemo(() => {
    return (
      sidebarCategories.find(
        (item) =>
          item.label === rawCategory
      ) || sidebarCategories[0]
    );
  }, [rawCategory]);

  const category = selected.category;

  const categoryProducts = useMemo(() => {
  if (category === "All") {
    return products;
  }

  let filtered = products.filter(
    (product) => product.category === category
  );

  if (
    selected.subcategories &&
    selected.subcategories.length > 0
  ) {
    filtered = filtered.filter(
      (product) =>
        product.subcategory !== undefined &&
        selected.subcategories!.includes(
          product.subcategory
        )
    );
  }

  return filtered;
}, [
  products,
  category,
  selected,
]);

  const availableSubcategories =
    useMemo(() => {
      const subcategories =
        categoryProducts
          .map(
            (product) =>
              product.subcategory
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          );

      return [
        ...new Set(subcategories),
      ];
    }, [categoryProducts]);

  const filteredProducts =
    useMemo(() => {
      const q =
        search
          .toLowerCase()
          .trim();

      const filtered =
        categoryProducts.filter(
          (product) => {
            const matchesSubcategory =
              !subcategory ||
              product.subcategory ===
                subcategory;

            const searchableText = [
              product.name,
              product.brand,
              product.category,
              product.subcategory ||
                "",
              product.productType ||
                "",
              ...(product.tags || []),
            ]
              .join(" ")
              .toLowerCase();

            const matchesSearch =
              !q ||
              searchableText.includes(q);

            return (
              matchesSubcategory &&
              matchesSearch
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          switch (sort) {
            case "low":
              return (
                a.price -
                b.price
              );

            case "high":
              return (
                b.price -
                a.price
              );

            case "name":
              return a.name.localeCompare(
                b.name
              );

            default:
              return 0;
          }
        }
      );
    }, [
      categoryProducts,
      subcategory,
      search,
      sort,
    ]);

  const handleProductClick = (
    productId: string | number
  ) => {
    navigate(
      `/products/${productId}`
    );
  };

  const title =
    subcategory ||
    (rawCategory ===
    "All Categories"
      ? "All Products"
      : rawCategory);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <div className="flex">
        <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-10">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-7">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                {title}
              </h1>
            </div>

            <div className="relative mb-5">
              <Search
                size={22}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search products, brands and more..."
                className="h-16 w-full rounded-xl border border-gray-200 bg-white pl-14 pr-16 text-lg text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0F6B3D] focus:ring-2 focus:ring-green-100"
              />

              <button
                type="button"
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#0F6B3D] transition hover:bg-green-50"
                aria-label="Voice search"
              >
                <Mic size={22} />
              </button>
            </div>

            {availableSubcategories.length >
              0 && (
              <div className="mb-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSubcategory("")
                  }
                  className={`rounded-full border px-5 py-3 text-sm font-medium transition ${
                    !subcategory
                      ? "border-[#0F6B3D] bg-[#0F6B3D] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#0F6B3D]"
                  }`}
                >
                  All
                </button>

                {availableSubcategories.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setSubcategory(
                          item
                        )
                      }
                      className={`rounded-full border px-5 py-3 text-sm font-medium transition ${
                        subcategory ===
                        item
                          ? "border-[#0F6B3D] bg-[#0F6B3D] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#0F6B3D]"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg text-gray-500">
                {filteredProducts.length}{" "}
                {filteredProducts.length ===
                1
                  ? "product"
                  : "products"}
              </p>

              <div className="relative w-full sm:w-56">
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(
                      event.target.value
                    )
                  }
                  className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-gray-700 outline-none transition focus:border-[#0F6B3D]"
                >
                  <option value="featured">
                    Featured
                  </option>

                  <option value="low">
                    Price: Low to High
                  </option>

                  <option value="high">
                    Price: High to Low
                  </option>

                  <option value="name">
                    Name: A to Z
                  </option>
                </select>

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            {filteredProducts.length >
            0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map(
                  (product) => (
                    <div
                      key={product.id}
                      onClick={() =>
                        handleProductClick(
                          product.id
                        )
                      }
                      className="cursor-pointer"
                    >
                      <ProductCard
                        product={product}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <Search
                    size={28}
                    className="text-[#0F6B3D]"
                  />
                </div>

                <h2 className="text-xl font-bold text-gray-900">
                  No products found
                </h2>

                <p className="mt-2 max-w-md text-gray-500">
                  We couldn't find products
                  matching your search or
                  selected category.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSubcategory("");
                    setRawCategory(
                      "All Categories"
                    );
                  }}
                  className="mt-6 rounded-lg bg-[#0F6B3D] px-6 py-3 font-semibold text-white transition hover:bg-[#0b5a32]"
                >
                  Show All Products
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}