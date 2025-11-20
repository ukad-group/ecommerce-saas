/**
 * Enhanced Cart page functionality with real-time validation and header updates
 * Version: 2025-11-19
 */

(function () {
    'use strict';

    let updateTimeout = null;

    // Get currency symbol from the page
    const getCurrencySymbol = () => {
        const subtotalElement = document.querySelector('#cart-subtotal');
        if (subtotalElement) {
            const text = subtotalElement.textContent.trim();
            const match = text.match(/^([^\d]+)/);
            return match ? match[1] : '$';
        }
        return '$';
    };

    const currencySymbol = getCurrencySymbol();

    /**
     * Update cart badge in header
     */
    function updateCartBadge() {
        const quantityInputs = document.querySelectorAll('.quantity-input');
        const totalItems = Array.from(quantityInputs).reduce((sum, input) => {
            return sum + parseInt(input.value || 0);
        }, 0);

        // Update header badge (if it exists)
        const cartBadge = document.querySelector('.navbar .badge, .cart-count');
        if (cartBadge) {
            cartBadge.textContent = totalItems;
        }

        // Update page header
        const pageHeader = document.querySelector('.card-header h5');
        if (pageHeader) {
            pageHeader.textContent = `Cart Items (${totalItems} items)`;
        }
    }

    /**
     * Initialize cart quantity inputs
     */
    function initializeCart() {
        const quantityInputs = document.querySelectorAll('.quantity-input');

        if (quantityInputs.length === 0) {
            return; // Not on cart page
        }

        quantityInputs.forEach(input => {
            // Store the initial quantity as valid
            input.dataset.validQuantity = input.value;

            // Enforce max on input
            input.addEventListener('input', function () {
                const max = parseInt(this.getAttribute('max') || 99);
                const value = parseInt(this.value || 0);

                if (value > max) {
                    this.value = max;
                    showStockWarning(this, max);
                }

                // Update header in real-time
                updateCartBadge();

                this.dataset.changed = 'true';

                // Clear existing timeout
                if (updateTimeout) {
                    clearTimeout(updateTimeout);
                }

                // Update after 1 second of no typing
                updateTimeout = setTimeout(() => {
                    updateCartItem(this);
                }, 1000);
            });

            // Update on change (when user presses Enter or uses arrows)
            input.addEventListener('change', function () {
                updateCartItem(this);
            });

            // Update on blur (when user leaves the field)
            input.addEventListener('blur', function () {
                if (this.dataset.changed === 'true') {
                    updateCartItem(this);
                }
            });
        });

        // Initialize header badge
        updateCartBadge();
    }

    /**
     * Show stock warning
     */
    function showStockWarning(inputElement, maxStock) {
        const wrapper = inputElement.closest('.quantity-wrapper');
        let errorDiv = wrapper.querySelector('.stock-error');
        if (!errorDiv) {
            errorDiv = document.createElement('small');
            errorDiv.className = 'stock-error text-warning d-block mt-1';
            wrapper.appendChild(errorDiv);
        }
        errorDiv.textContent = `Only ${maxStock} available in stock`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    /**
     * Update a cart item via AJAX
     * @param {HTMLInputElement} inputElement - The quantity input element
     */
    async function updateCartItem(inputElement) {
        const itemId = inputElement.dataset.itemId;
        const quantity = parseInt(inputElement.value);
        const unitPrice = parseFloat(inputElement.dataset.unitPrice);

        // Validate quantity
        if (quantity < 1 || isNaN(quantity)) {
            inputElement.value = 1;
            return;
        }

        // Reset changed flag
        inputElement.dataset.changed = 'false';

        // Show updating indicator
        const wrapper = inputElement.closest('.quantity-wrapper');
        const indicator = wrapper.querySelector('.updating-indicator');
        if (indicator) {
            indicator.classList.remove('d-none');
        }

        // Disable input during update
        inputElement.disabled = true;

        try {
            // Send update request
            const formData = new FormData();
            formData.append('itemId', itemId);
            formData.append('quantity', quantity);

            const response = await fetch('/Cart/UpdateItem', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Store this as the valid quantity for future rollback
                inputElement.dataset.validQuantity = quantity.toString();

                // Calculate new item subtotal immediately for instant feedback
                const itemSubtotal = quantity * unitPrice;
                const subtotalElement = document.querySelector(`.item-subtotal[data-item-id="${itemId}"]`);
                if (subtotalElement) {
                    subtotalElement.textContent = currencySymbol + itemSubtotal.toFixed(2);
                }

                // Clear any existing error message for this item
                const errorMsg = wrapper.querySelector('.stock-error');
                if (errorMsg) {
                    errorMsg.remove();
                }

                // Fetch updated cart totals from server
                await updateCartTotals();

                // Update header badge
                updateCartBadge();
            } else if (response.status === 400) {
                // Stock validation failed - extract stock limit and update max attribute
                const errorText = await response.text();
                console.error('Stock validation failed:', errorText);

                // Extract available stock from error message
                // Format: "Insufficient stock for 'Product'. Requested: X, Available: Y"
                let availableStock = null;
                const availableMatch = errorText.match(/Available:\s*(\d+)/);
                if (availableMatch) {
                    availableStock = parseInt(availableMatch[1]);
                    // Update the max attribute for future validation
                    inputElement.setAttribute('max', availableStock);
                    inputElement.dataset.availableStock = availableStock;
                }

                // Extract the error message
                let errorMessage = 'Insufficient stock available';
                if (errorText.includes('Insufficient stock')) {
                    const match = errorText.match(/Insufficient stock[^"]*/);
                    if (match) {
                        errorMessage = match[0];
                    }
                }

                // Show error message below the input
                let errorDiv = wrapper.querySelector('.stock-error');
                if (!errorDiv) {
                    errorDiv = document.createElement('small');
                    errorDiv.className = 'stock-error text-danger d-block mt-1 fw-bold';
                    wrapper.appendChild(errorDiv);
                }
                errorDiv.textContent = errorMessage;

                // Reset to previous valid quantity
                const previousQty = inputElement.dataset.validQuantity || '1';
                inputElement.value = previousQty;

                // Update header badge to correct value
                updateCartBadge();
            } else {
                console.error('Failed to update cart item');
                alert('Failed to update cart. Please try again.');
            }
        } catch (error) {
            console.error('Error updating cart:', error);
            alert('Error updating cart. Please try again.');
        } finally {
            // Hide updating indicator
            if (indicator) {
                indicator.classList.add('d-none');
            }
            // Re-enable input
            inputElement.disabled = false;
        }
    }

    /**
     * Fetch updated cart totals from the server
     */
    async function updateCartTotals() {
        try {
            const response = await fetch('/Cart', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Update cart summary totals
                const newSubtotal = doc.querySelector('#cart-subtotal');
                const newTax = doc.querySelector('#cart-tax');
                const newTotal = doc.querySelector('#cart-total');

                if (newSubtotal) {
                    document.querySelector('#cart-subtotal').textContent = newSubtotal.textContent;
                }
                if (newTax) {
                    document.querySelector('#cart-tax').textContent = newTax.textContent;
                }
                if (newTotal) {
                    document.querySelector('#cart-total').textContent = newTotal.textContent;
                }
            }
        } catch (error) {
            console.error('Error fetching cart totals:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCart);
    } else {
        initializeCart();
    }
})();
