---
description: "Task list for Shopping Cart and Order Management implementation"
---

# Tasks: Shopping Cart and Order Management

**Input**: Design documents from `/specs/002-cart-order-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are not included in this implementation as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`
- Paths shown below use frontend/ directory structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Vite project with React and TypeScript at frontend/ using Vite 5.x template
- [x] T002 Install core dependencies (react-router-dom 6.x, @tanstack/react-query v5, zustand 4.x, msw 2.x) in frontend/package.json
- [x] T003 [P] Configure TypeScript with strict mode in frontend/tsconfig.json
- [x] T004 [P] Configure Vite build and dev server settings in frontend/vite.config.ts
- [x] T005 [P] Install and configure Tailwind CSS in frontend/tailwind.config.js
- [x] T006 [P] Install Headless UI components (@headlessui/react) in frontend/package.json
- [x] T007 [P] Install React Hook Form and zod validator in frontend/package.json
- [x] T008 [P] Configure Vitest for testing in frontend/vite.config.ts
- [x] T009 [P] Install React Testing Library (@testing-library/react, @testing-library/jest-dom) in frontend/package.json
- [x] T010 Create project folder structure (components/, pages/, services/, mocks/, store/, types/, utils/) in frontend/src/
- [x] T011 [P] Create environment configuration with VITE_TENANT_ID, VITE_API_BASE_URL, VITE_USE_MOCKS in frontend/.env.local
- [x] T012 [P] Configure ESLint and Prettier for code quality in frontend/
- [x] T013 Create base CSS with Tailwind directives in frontend/src/index.css
- [x] T014 Create HTML entry point in frontend/index.html
- [x] T015 Update package.json scripts (dev, build, test, preview) in frontend/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T016 [P] Create Order type definition (id, tenantId, customerId, orderNumber, status, totals, timestamps) in frontend/src/types/order.ts
- [x] T017 [P] Create OrderLineItem type definition in frontend/src/types/order.ts
- [x] T018 [P] Create OrderStatus enum ('new' | 'submitted' | 'paid' | 'completed' | 'cancelled') in frontend/src/types/order.ts
- [x] T019 [P] Create OrderStatusHistory type definition in frontend/src/types/order.ts
- [x] T020 [P] Create ShippingAddress and BillingAddress type definitions in frontend/src/types/address.ts
- [x] T021 [P] Create PaymentTransaction type definition in frontend/src/types/payment.ts
- [x] T022 [P] Create Customer type definition in frontend/src/types/customer.ts
- [x] T023 [P] Create API request/response types in frontend/src/types/api.ts
- [x] T024 Create base API client with fetch wrapper and tenant context in frontend/src/services/api/client.ts
- [x] T025 Configure MSW browser worker in frontend/src/mocks/browser.ts
- [x] T026 Configure MSW server worker for tests in frontend/src/mocks/server.ts
- [x] T027 [P] Create mock products data (20 sample products) in frontend/src/mocks/data/mockProducts.ts
- [x] T028 [P] Create mock customers data in frontend/src/mocks/data/mockCustomers.ts
- [x] T029 [P] Create mock orders data (5 sample orders in various statuses) in frontend/src/mocks/data/mockOrders.ts
- [x] T030 Create React Router configuration with route structure in frontend/src/router.tsx
- [x] T031 Create TanStack Query provider setup in frontend/src/App.tsx
- [x] T032 Enable MSW in development mode in frontend/src/main.tsx
- [x] T033 [P] Create currency formatting utility in frontend/src/utils/currency.ts
- [x] T034 [P] Create form validation utility in frontend/src/utils/validation.ts
- [x] T035 [P] Create localStorage helper utilities in frontend/src/utils/storage.ts
- [x] T036 [P] Create order status helper utilities (valid transitions) in frontend/src/utils/orderHelpers.ts
- [x] T037 [P] Create common Button component in frontend/src/components/common/Button.tsx
- [x] T038 [P] Create common Input component in frontend/src/components/common/Input.tsx
- [x] T039 [P] Create common Select component in frontend/src/components/common/Select.tsx
- [x] T040 [P] Create common LoadingSpinner component in frontend/src/components/common/LoadingSpinner.tsx
- [x] T041 Create user store for current user context with Zustand in frontend/src/store/userStore.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Products to Cart (Priority: P1)

**Goal**: Enable customers to add products to cart, view cart contents, and see cart indicator

**Independent Test**: Add products to cart, view cart page, verify cart count updates, check order created with "new" status

### Implementation for User Story 1

- [x] T042 Create cart store with Zustand and persist middleware for localStorage in frontend/src/store/cartStore.ts
- [x] T043 [P] Create CartItem component (product display, quantity, price, line total) in frontend/src/components/cart/CartItem.tsx
- [x] T044 [P] Create CartSummary component (subtotal, tax, shipping, total) in frontend/src/components/cart/CartSummary.tsx
- [x] T045 [P] Create CartIndicator component (item count badge) in frontend/src/components/cart/CartIndicator.tsx
- [x] T046 [P] Create EmptyCart component (message when cart is empty) in frontend/src/components/cart/EmptyCart.tsx
- [x] T047 Create cart API client methods (getCart, addToCart) in frontend/src/services/api/cartApi.ts
- [x] T048 Create useCart hook with TanStack Query (queries for cart data) in frontend/src/services/hooks/useCart.ts
- [x] T049 Create MSW handlers for GET /api/v1/cart in frontend/src/mocks/handlers/cartHandlers.ts
- [x] T050 Create MSW handlers for POST /api/v1/cart/items in frontend/src/mocks/handlers/cartHandlers.ts
- [x] T051 Create CartPage component assembling cart UI in frontend/src/pages/CartPage.tsx
- [x] T052 Add cart routes to router configuration in frontend/src/router.tsx
- [x] T053 Integrate CartIndicator into main navigation/header in frontend/src/App.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Modify Cart Contents (Priority: P1)

**Goal**: Enable customers to update quantities, remove items, and clear cart

**Independent Test**: Change product quantities, remove items, clear cart, verify totals update correctly

### Implementation for User Story 2

- [ ] T054 Add update and remove mutations to cart store in frontend/src/store/cartStore.ts
- [ ] T055 Extend CartItem component with quantity input and remove button in frontend/src/components/cart/CartItem.tsx
- [ ] T056 Add clear cart functionality to CartPage in frontend/src/pages/CartPage.tsx
- [ ] T057 Add cart API client methods (updateCartItem, removeCartItem, clearCart) in frontend/src/services/api/cartApi.ts
- [ ] T058 Add mutations to useCart hook (update, remove, clear) in frontend/src/services/hooks/useCart.ts
- [ ] T059 [P] Create MSW handlers for PUT /api/v1/cart/items/{lineItemId} in frontend/src/mocks/handlers/cartHandlers.ts
- [ ] T060 [P] Create MSW handlers for DELETE /api/v1/cart/items/{lineItemId} in frontend/src/mocks/handlers/cartHandlers.ts
- [ ] T061 Create MSW handlers for DELETE /api/v1/cart in frontend/src/mocks/handlers/cartHandlers.ts
- [ ] T062 Add optimistic updates for cart mutations in frontend/src/services/hooks/useCart.ts
- [ ] T063 Add out-of-stock warning display in CartItem component in frontend/src/components/cart/CartItem.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Proceed to Checkout (Priority: P1)

**Goal**: Enable customers to complete checkout with shipping, billing, payment, and order submission

**Independent Test**: Proceed from cart to checkout, enter addresses and payment, verify order transitions from "new" to "submitted" to "paid"

### Implementation for User Story 4

- [ ] T064 Create checkout store with Zustand for checkout flow state in frontend/src/store/checkoutStore.ts
- [ ] T065 [P] Create ShippingForm component with React Hook Form in frontend/src/components/checkout/ShippingForm.tsx
- [ ] T066 [P] Create BillingForm component with React Hook Form and "same as shipping" toggle in frontend/src/components/checkout/BillingForm.tsx
- [ ] T067 [P] Create PaymentForm component with React Hook Form in frontend/src/components/checkout/PaymentForm.tsx
- [ ] T068 [P] Create OrderReview component showing order summary in frontend/src/components/checkout/OrderReview.tsx
- [ ] T069 [P] Create CheckoutProgress component (wizard steps indicator) in frontend/src/components/checkout/CheckoutProgress.tsx
- [ ] T070 Create checkout API client methods (validateCart, setShipping, setBilling, submitOrder, processPayment) in frontend/src/services/api/checkoutApi.ts
- [ ] T071 Create useCheckout hook with TanStack Query in frontend/src/services/hooks/useCheckout.ts
- [ ] T072 [P] Create MSW handlers for POST /api/v1/checkout/validate in frontend/src/mocks/handlers/checkoutHandlers.ts
- [ ] T073 [P] Create MSW handlers for POST /api/v1/checkout/shipping in frontend/src/mocks/handlers/checkoutHandlers.ts
- [ ] T074 [P] Create MSW handlers for POST /api/v1/checkout/billing in frontend/src/mocks/handlers/checkoutHandlers.ts
- [ ] T075 [P] Create MSW handlers for POST /api/v1/checkout/submit in frontend/src/mocks/handlers/checkoutHandlers.ts
- [ ] T076 Create MSW handlers for POST /api/v1/checkout/payment in frontend/src/mocks/handlers/checkoutHandlers.ts
- [ ] T077 Create CheckoutPage component with multi-step wizard in frontend/src/pages/CheckoutPage.tsx
- [ ] T078 Create OrderConfirmationPage component in frontend/src/pages/OrderConfirmationPage.tsx
- [ ] T079 Add checkout routes to router configuration in frontend/src/router.tsx
- [ ] T080 Add address validation logic (postal code format, required fields) in frontend/src/utils/validation.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 4 should all work independently

---

## Phase 6: User Story 5 - Order Status Tracking (Priority: P1)

**Goal**: Enable customers to view order history and track order status

**Independent Test**: Place order, view order history, view order details, verify status timeline displays correctly

### Implementation for User Story 5

- [ ] T081 [P] Create OrderList component with filtering and sorting in frontend/src/components/orders/OrderList.tsx
- [ ] T082 [P] Create OrderDetails component showing full order information in frontend/src/components/orders/OrderDetails.tsx
- [ ] T083 [P] Create OrderStatusBadge component with color-coded status display in frontend/src/components/orders/OrderStatusBadge.tsx
- [ ] T084 [P] Create OrderStatusHistory component showing status timeline in frontend/src/components/orders/OrderStatusHistory.tsx
- [ ] T085 Create orders API client methods (getOrders, getOrderById, getStatusHistory, cancelOrder) in frontend/src/services/api/ordersApi.ts
- [ ] T086 Create useOrders hook with TanStack Query in frontend/src/services/hooks/useOrders.ts
- [ ] T087 [P] Create MSW handlers for GET /api/v1/orders in frontend/src/mocks/handlers/ordersHandlers.ts
- [ ] T088 [P] Create MSW handlers for GET /api/v1/orders/{orderId} in frontend/src/mocks/handlers/ordersHandlers.ts
- [ ] T089 [P] Create MSW handlers for GET /api/v1/orders/{orderId}/status-history in frontend/src/mocks/handlers/ordersHandlers.ts
- [ ] T090 Create MSW handlers for POST /api/v1/orders/{orderId}/cancel in frontend/src/mocks/handlers/ordersHandlers.ts
- [ ] T091 Create OrderHistoryPage component in frontend/src/pages/OrderHistoryPage.tsx
- [ ] T092 Create OrderDetailsPage component in frontend/src/pages/OrderDetailsPage.tsx
- [ ] T093 Add order routes to router configuration in frontend/src/router.tsx

**Checkpoint**: At this point, User Stories 1, 2, 4, AND 5 should all work independently

---

## Phase 7: User Story 6 - Admin Order Management (Priority: P1)

**Goal**: Enable admins to view, filter, and manage all orders across tenants

**Independent Test**: Access admin dashboard, filter orders, update order status, add notes, verify admin actions work correctly

### Implementation for User Story 6

- [ ] T094 [P] Create AdminOrderList component with advanced filtering in frontend/src/components/admin/AdminOrderList.tsx
- [ ] T095 [P] Create OrderFilters component (status, tenant, date range, search) in frontend/src/components/admin/OrderFilters.tsx
- [ ] T096 [P] Create OrderActions component (status update, add note, refund) in frontend/src/components/admin/OrderActions.tsx
- [ ] T097 Create admin API client methods (getAdminOrders, updateOrderStatus, addOrderNote, processRefund, exportOrders) in frontend/src/services/api/adminApi.ts
- [ ] T098 Create useAdminOrders hook with TanStack Query in frontend/src/services/hooks/useAdminOrders.ts
- [ ] T099 [P] Create MSW handlers for GET /api/v1/admin/orders in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T100 [P] Create MSW handlers for GET /api/v1/admin/orders/{orderId} in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T101 [P] Create MSW handlers for PUT /api/v1/admin/orders/{orderId}/status in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T102 [P] Create MSW handlers for POST /api/v1/admin/orders/{orderId}/notes in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T103 [P] Create MSW handlers for POST /api/v1/admin/orders/{orderId}/refund in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T104 Create MSW handlers for GET /api/v1/admin/orders/export in frontend/src/mocks/handlers/adminHandlers.ts
- [ ] T105 Create AdminOrdersPage component with dashboard layout in frontend/src/pages/admin/AdminOrdersPage.tsx
- [ ] T106 Add admin routes to router configuration in frontend/src/router.tsx

**Checkpoint**: At this point, all P1 user stories (1, 2, 4, 5, 6) should be fully functional

---

## Phase 8: User Story 3 - Persistent Cart Across Sessions (Priority: P2)

**Goal**: Enable cart persistence across sessions and devices for logged-in users

**Independent Test**: Add items to cart, logout/login, verify cart persists; test guest cart merge on login

### Implementation for User Story 3

- [ ] T107 Configure Zustand persist middleware for cart store with localStorage in frontend/src/store/cartStore.ts
- [ ] T108 Add cart expiration logic (30 days) to storage utilities in frontend/src/utils/storage.ts
- [ ] T109 Add expired cart cleanup on cart load in frontend/src/store/cartStore.ts
- [ ] T110 Implement guest cart merge logic when user logs in in frontend/src/store/cartStore.ts
- [ ] T111 Add cart sync across tabs using localStorage events in frontend/src/store/cartStore.ts
- [ ] T112 Update MSW handlers to support cart merge scenarios in frontend/src/mocks/handlers/cartHandlers.ts
- [ ] T113 Add cart restoration on app initialization in frontend/src/App.tsx
- [ ] T114 Add notification for expired cart items removed in frontend/src/pages/CartPage.tsx

**Checkpoint**: At this point, cart persistence works across sessions and devices

---

## Phase 9: User Story 8 - Order Cancellation and Refunds (Priority: P2)

**Goal**: Enable customers to cancel orders and request refunds; admins to process refunds

**Independent Test**: Request order cancellation, verify status changes; admin processes refund, verify refund tracked

### Implementation for User Story 8

- [ ] T115 Add cancel order button to OrderDetails component with status validation in frontend/src/components/orders/OrderDetails.tsx
- [ ] T116 Add refund request functionality to OrderDetails component in frontend/src/components/orders/OrderDetails.tsx
- [ ] T117 Extend admin OrderActions component with refund processing UI in frontend/src/components/admin/OrderActions.tsx
- [ ] T118 Add refund display to PaymentTransaction in OrderDetails in frontend/src/components/orders/OrderDetails.tsx
- [ ] T119 Update order status helper utilities to validate cancellation rules in frontend/src/utils/orderHelpers.ts
- [ ] T120 Add refund tracking to order type definition in frontend/src/types/payment.ts
- [ ] T121 Update MSW handlers to support refund scenarios in frontend/src/mocks/handlers/adminHandlers.ts

**Checkpoint**: At this point, cancellation and refund functionality is complete

---

## Phase 10: User Story 7 - Cart Abandonment Recovery (Priority: P3)

**Goal**: Identify abandoned carts and trigger recovery emails

**Independent Test**: Abandon cart (24 hours inactive), verify system marks as abandoned, recovery email triggered

### Implementation for User Story 7

- [ ] T122 Create abandoned cart detection logic (24 hours inactive) in frontend/src/utils/orderHelpers.ts
- [ ] T123 Create abandoned cart data structure and tracking in frontend/src/types/order.ts
- [ ] T124 Add abandoned cart identification to mock data in frontend/src/mocks/data/mockOrders.ts
- [ ] T125 Create abandoned cart recovery email trigger simulation in MSW handlers in frontend/src/mocks/handlers/cartHandlers.ts
- [ ] T126 Add abandoned cart recovery link handling to CartPage in frontend/src/pages/CartPage.tsx
- [ ] T127 Create abandoned cart metrics mock data for admin dashboard in frontend/src/mocks/data/mockOrders.ts

**Checkpoint**: At this point, all user stories (P1, P2, P3) are implemented

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T128 Add loading states to all API calls using LoadingSpinner component across all pages
- [ ] T129 Add error handling and error boundaries to all pages in frontend/src/
- [ ] T130 Add toast notifications for user actions (item added, order submitted, etc.) in frontend/src/App.tsx
- [ ] T131 Optimize bundle size with code splitting for route-based chunks in frontend/vite.config.ts
- [ ] T132 Add accessibility attributes (ARIA labels, keyboard navigation) to all interactive components
- [ ] T133 Test and fix responsive design for mobile/tablet views across all pages
- [ ] T134 Add proper meta tags and SEO optimization in frontend/index.html
- [ ] T135 Create README with setup instructions in frontend/README.md
- [ ] T136 [P] Validate all OpenAPI contracts match MSW implementation in specs/002-cart-order-management/contracts/
- [ ] T137 [P] Update quickstart.md with final testing scenarios in specs/002-cart-order-management/quickstart.md
- [ ] T138 Run production build and verify no errors or warnings
- [ ] T139 Test complete user journey end-to-end (browse, cart, checkout, order tracking)
- [ ] T140 Validate multi-tenant isolation works correctly with different tenant IDs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (US1 - P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (US2 - P1)**: Extends US1 components but should be independently testable
- **User Story 4 (US4 - P1)**: Can start after Foundational - May integrate with US1 cart but independently testable
- **User Story 5 (US5 - P1)**: Can start after Foundational - Independently testable
- **User Story 6 (US6 - P1)**: Can start after Foundational - Independently testable
- **User Story 3 (US3 - P2)**: Extends US1 cart store with persistence logic
- **User Story 8 (US8 - P2)**: Extends US5 and US6 components with cancellation/refund
- **User Story 7 (US7 - P3)**: Depends on cart functionality from US1

### Within Each User Story

- MSW handlers can be created in parallel with API client methods
- Components marked [P] can be created in parallel (different files)
- Store setup before components that use it
- API client before hooks that use it
- Hooks before pages that use them
- Components before pages that assemble them

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, P1 user stories (US1, US2, US4, US5, US6) can start in parallel (if team capacity allows)
- Components marked [P] within each user story can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Add to Cart)
4. Complete Phase 4: User Story 2 (Modify Cart)
5. Complete Phase 5: User Story 4 (Checkout)
6. Complete Phase 6: User Story 5 (Order Tracking)
7. Complete Phase 7: User Story 6 (Admin Management)
8. **STOP and VALIDATE**: Test all P1 functionality independently
9. Complete Phase 11: Polish
10. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Cart functionality!)
3. Add User Story 2 → Test independently → Deploy/Demo (Cart management!)
4. Add User Story 4 → Test independently → Deploy/Demo (Checkout flow!)
5. Add User Story 5 → Test independently → Deploy/Demo (Order tracking!)
6. Add User Story 6 → Test independently → Deploy/Demo (Admin features!)
7. Add User Story 3 → Test independently → Deploy/Demo (Cart persistence!)
8. Add User Story 8 → Test independently → Deploy/Demo (Refunds!)
9. Add User Story 7 → Test independently → Deploy/Demo (Abandonment!)
10. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 2 (Cart features)
   - Developer B: User Story 4 (Checkout)
   - Developer C: User Story 5 + User Story 6 (Order management)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- MSW handlers match OpenAPI contracts exactly
- All API abstractions in services/api/ for easy real backend swap
