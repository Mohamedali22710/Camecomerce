"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import api from "@/lib/api"
import { parseImageURLs } from "@/lib/locale"

export interface CartItem {
  _id: string
  productId: string
  name: string
  en_name?: string
  ar_name?: string
  image: string
  price: number
  originalPrice?: number
  quantity: number
  link?: string
  stock?: number
  inStock?: boolean
  details?: { label: string; value: string }[]
  // Bundle fields (preserved):
  itemType?: "product" | "bundle"
  bundleId?: string
  hddOption?: string
  installationOption?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number; _id?: string; productId?: string }) => void
  removeItem: (idOrKey: string) => void
  updateQuantity: (idOrKey: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
  shippingCost: number
  total: number
  currency: string
  fetchFromApi: (token: string, role: string) => Promise<void>
  refreshStock: () => Promise<void>
  hasOutOfStockItems: boolean
}

export function getCartItemKey(item: {
  productId?: string
  _id?: string
  bundleId?: string
  hddOption?: string | null
  installationOption?: string | null
  itemType?: string
}): string {
  if (item.itemType === "bundle" || item.bundleId) {
    return `bundle_${item.bundleId}_${item.hddOption || "none"}_${item.installationOption || "none"}`
  }
  return String(item.productId || item._id)
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = "cart-items"

interface StoreShippingConfig {
  cost: number
  type: string
}

function computeShipping(subtotal: number, config: StoreShippingConfig | null): number {
  if (!config) {
    const costType = process.env.NEXT_PUBLIC_SHIPPING_COST_TYPE || "fixed"
    const costValue = Number(process.env.NEXT_PUBLIC_SHIPPING_COST_VALUE) || 0
    return costType === "percentage"
      ? Math.round(((subtotal * costValue) / 100) * 100) / 100
      : costValue
  }
  return config.type === "percentage"
    ? Math.round(((subtotal * config.cost) / 100) * 100) / 100
    : config.cost
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [shippingCost, setShippingCost] = useState<number | null>(null)
  const [storeShipping, setStoreShipping] = useState<StoreShippingConfig | null>(null)
  const [currency, setCurrency] = useState<string>("SAR")
  const isSyncingRef = useRef(false)

  // Fetch store shipping settings on mount
  useEffect(() => {
    let isMounted = true
    api
      .get("/settings/shipping")
      .then((res) => {
        if (!isMounted) return
        const data = res.data?.data
        if (data && typeof data.shippingCost === "number") {
          setStoreShipping({
            cost: data.shippingCost,
            type: data.shippingType || "fixed",
          })
          if (data.currency) {
            setCurrency(data.currency)
          }
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
    return () => {
      isMounted = false
    }
  }, [])

  // 1. Initial load and deduplication from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const deduplicated: CartItem[] = []
          const keySet = new Set<string>()
          for (const raw of parsed) {
            const prodId = String(raw.productId || raw._id)
            const normalized: CartItem = {
              ...raw,
              productId: prodId,
              _id: String(raw._id || prodId),
              quantity: Math.max(1, Number(raw.quantity) || 1),
            }
            const key = getCartItemKey(normalized)
            if (!keySet.has(key)) {
              keySet.add(key)
              deduplicated.push(normalized)
            } else {
              const existingIdx = deduplicated.findIndex((i) => getCartItemKey(i) === key)
              if (existingIdx > -1) {
                deduplicated[existingIdx].quantity += normalized.quantity
              }
            }
          }
          setItems(deduplicated)
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  // 2. Persist to localStorage whenever items change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch {
        // ignore
      }
    }
  }, [items, loaded])

  // Helpers to synchronize actions with the backend database
  const syncAddBackend = async (item: CartItem, quantity: number) => {
    try {
      if (item.itemType === "bundle" && item.bundleId) {
        await api.post("/cart", {
          itemType: "bundle",
          bundleId: item.bundleId,
          hddOption: item.hddOption || "none",
          installationOption: item.installationOption || "none",
          quantity,
        })
      } else {
        const prodId = item.productId || item._id
        if (prodId) {
          await api.post("/cart", {
            productId: prodId,
            quantity,
          })
        }
      }
    } catch {
      // Offline or unauthenticated; local cart remains safe
    }
  }

  const syncUpdateBackend = async (idOrKey: string, quantity: number) => {
    try {
      const target = items.find((i) => getCartItemKey(i) === idOrKey || i._id === idOrKey || i.productId === idOrKey)
      const targetId = target?._id || target?.productId || idOrKey
      await api.put(`/cart/${targetId}`, { quantity })
    } catch {
      // ignore
    }
  }

  const syncRemoveBackend = async (idOrKey: string) => {
    try {
      const target = items.find((i) => getCartItemKey(i) === idOrKey || i._id === idOrKey || i.productId === idOrKey)
      const targetId = target?._id || target?.productId || idOrKey
      await api.delete(`/cart/${targetId}`)
    } catch {
      // ignore
    }
  }

  const syncClearBackend = async () => {
    try {
      await api.delete("/cart")
    } catch {
      // ignore
    }
  }

  // 3. Add Item with unified productId and prevention of duplicate counts
  const addItem = (newItemInput: Omit<CartItem, "quantity"> & { quantity?: number; _id?: string; productId?: string }) => {
    if (newItemInput.inStock === false) return
    if (newItemInput.stock !== undefined && newItemInput.stock !== null && Number(newItemInput.stock) <= 0) return

    const prodId = String(newItemInput.productId || newItemInput._id)
    const addQty = Math.max(1, newItemInput.quantity ?? 1)
    const newItem: CartItem = {
      ...newItemInput,
      _id: newItemInput._id || prodId,
      productId: prodId,
      quantity: addQty,
    }

    const itemKey = getCartItemKey(newItem)

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => getCartItemKey(i) === itemKey)
      if (existingIndex > -1) {
        const existing = prev[existingIndex]
        const maxStock = existing.stock ?? newItem.stock
        const updatedQty = maxStock !== undefined
          ? Math.min(existing.quantity + addQty, maxStock)
          : existing.quantity + addQty

        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, ...newItem, quantity: updatedQty, _id: existing._id || newItem._id }
            : item
        )
      }
      return [...prev, newItem]
    })

    syncAddBackend(newItem, addQty)
  }

  // 4. Remove Item by unified key or ID
  const removeItem = (idOrKey: string) => {
    setItems((prev) =>
      prev.filter((i) => getCartItemKey(i) !== idOrKey && i._id !== idOrKey && i.productId !== idOrKey)
    )
    syncRemoveBackend(idOrKey)
  }

  // 5. Update Quantity
  const updateQuantity = (idOrKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(idOrKey)
      return
    }
    setItems((prev) =>
      prev.map((i) => {
        if (getCartItemKey(i) === idOrKey || i._id === idOrKey || i.productId === idOrKey) {
          const maxStock = i.stock
          const validQty = maxStock !== undefined ? Math.min(quantity, maxStock) : quantity
          return { ...i, quantity: validQty }
        }
        return i
      })
    )
    syncUpdateBackend(idOrKey, quantity)
  }

  // 6. Clear Cart
  const clearCart = () => {
    setItems([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    syncClearBackend()
  }

  // 7. Refresh Stock from Product API
  const refreshStock = async () => {
    if (items.length === 0) return
    try {
      const updated = await Promise.all(
        items.map(async (item) => {
          if (item.itemType === "bundle") return item
          const prodId = item.productId || item._id
          if (!prodId) return item
          try {
            const res = await api.get(`/products/${prodId}`)
            const prod = res.data?.data || res.data
            if (prod) {
              const stock = prod.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 100
              const isAvailable = Boolean(prod.isActive) && stock > 0
              return {
                ...item,
                stock,
                inStock: isAvailable,
              }
            }
          } catch {
            // keep existing item if endpoint fails
          }
          return item
        })
      )
      setItems(updated)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (loaded && items.length > 0) {
      refreshStock()
    }
  }, [loaded])

  // 8. Fetch From API & Synchronize with LocalStorage (never wipe local items on empty API response!)
  const fetchFromApi = async (_token: string, _role: string) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      const res = await api.get("/cart")
      const cartData = res.data?.data
      if (cartData && Array.isArray(cartData.items)) {
        const apiMapped: CartItem[] = cartData.items.map((ci: any) => {
          const isBundle = ci.itemType === "bundle" || Boolean(ci.bundleId)
          if (isBundle) {
            const bundle = ci.bundle
            return {
              _id: String(ci._id),
              productId: String(ci._id),
              itemType: "bundle" as const,
              bundleId: String(ci.bundleId?._id || ci.bundleId || ci._id),
              hddOption: ci.hddOption || ci.hdd?.code,
              installationOption: ci.installationOption || ci.installation?.code,
              name: bundle?.en_name || ci.name || "Bundle",
              en_name: bundle?.en_name,
              ar_name: bundle?.ar_name,
              image: bundle?.imageURLs?.[0] || "/placeholder.svg",
              price: ci.unitPrice ?? 0,
              quantity: ci.quantity ?? 1,
              stock: ci.stock ?? 100,
              inStock: ci.available !== false,
            }
          }

          const prod = ci.product
          const images = prod ? parseImageURLs(prod) : []
          const discountedPrice = prod?.discount
            ? prod.price - (prod.price * prod.discount) / 100
            : (prod?.price ?? ci.unitPrice ?? 0)

          const prodId = String(prod?._id || ci.productId || ci.product_id || ci._id)
          const stock =
            ci.stock !== undefined && ci.stock !== null
              ? Number(ci.stock)
              : prod?.stock !== undefined && prod?.stock !== null
                ? Number(prod.stock)
                : 100
          const isAvailable = ci.available !== false && (prod ? Boolean(prod.isActive) : true) && stock > 0

          return {
            _id: String(ci._id || prodId),
            productId: prodId,
            name: prod?.en_name || ci.name || "",
            en_name: prod?.en_name,
            ar_name: prod?.ar_name,
            image: images[0] || ci.image || "/placeholder.svg",
            price: discountedPrice,
            originalPrice: prod?.discount ? prod.price : undefined,
            quantity: ci.quantity ?? 1,
            stock,
            inStock: isAvailable,
            link: `/products/${prodId}`,
          }
        })

        // MERGE LOGIC: Prevent empty API response from wiping local cart items
        setItems((currentLocalItems) => {
          // If backend has items and local is empty, populate from API
          if (currentLocalItems.length === 0) {
            return apiMapped
          }

          // If backend is empty but local has items: KEEP LOCAL ITEMS and sync to backend!
          if (apiMapped.length === 0) {
            (async () => {
              for (const localItem of currentLocalItems) {
                if (localItem.itemType === "bundle" && localItem.bundleId) {
                  await api.post("/cart", {
                    itemType: "bundle",
                    bundleId: localItem.bundleId,
                    hddOption: localItem.hddOption || "none",
                    installationOption: localItem.installationOption || "none",
                    quantity: localItem.quantity,
                  }).catch(() => {})
                } else if (localItem.productId || localItem._id) {
                  await api.post("/cart", {
                    productId: localItem.productId || localItem._id,
                    quantity: localItem.quantity,
                  }).catch(() => {})
                }
              }
            })()
            return currentLocalItems
          }

          // Both have items: merge by key
          const mergedMap = new Map<string, CartItem>()

          // 1. Seed with API items
          for (const apiItem of apiMapped) {
            mergedMap.set(getCartItemKey(apiItem), apiItem)
          }

          // 2. Keep local items that are not in API (or take higher quantity), and upload missing
          const itemsToSync: CartItem[] = []
          for (const localItem of currentLocalItems) {
            const key = getCartItemKey(localItem)
            if (mergedMap.has(key)) {
              const apiItem = mergedMap.get(key)!
              mergedMap.set(key, {
                ...apiItem,
                quantity: Math.max(apiItem.quantity, localItem.quantity),
              })
            } else {
              mergedMap.set(key, localItem)
              itemsToSync.push(localItem)
            }
          }

          if (itemsToSync.length > 0) {
            (async () => {
              for (const item of itemsToSync) {
                if (item.itemType === "bundle" && item.bundleId) {
                  await api.post("/cart", {
                    itemType: "bundle",
                    bundleId: item.bundleId,
                    hddOption: item.hddOption || "none",
                    installationOption: item.installationOption || "none",
                    quantity: item.quantity,
                  }).catch(() => {})
                } else if (item.productId || item._id) {
                  await api.post("/cart", {
                    productId: item.productId || item._id,
                    quantity: item.quantity,
                  }).catch(() => {})
                }
              }
            })()
          }

          return Array.from(mergedMap.values())
        })

        if (cartData.shippingCost !== undefined) setShippingCost(cartData.shippingCost)
        if (cartData.currency) setCurrency(cartData.currency)
      }
    } catch {
      // Never wipe or discard local items on network or API error
    } finally {
      isSyncingRef.current = false
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const computedShipping =
    items.length === 0
      ? 0
      : shippingCost !== null
        ? shippingCost
        : computeShipping(subtotal, storeShipping)
  const total = Math.round((subtotal + computedShipping) * 100) / 100
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const hasOutOfStockItems = items.some(
    (item) => item.inStock === false || (item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0)
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        shippingCost: computedShipping,
        total,
        currency,
        fetchFromApi,
        refreshStock,
        hasOutOfStockItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
