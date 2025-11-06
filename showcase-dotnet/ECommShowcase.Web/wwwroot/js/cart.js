/**
 * Cart page functionality - Auto-updating cart quantities with AJAX
 */

(function () {
    'use strict';

    let updateTimeout = null;

    // Get currency symbol from the page
    const getCurrencySymbol = () => {
        const subtotalElement = document.querySelector('#cart-subtotal');
        if (subtotalElement) {
            const text = subtotalElement.textContent.trim();
            // Extract currency symbol (first character before numbers)
            const match = text.match(/^([^\d]+)/);
            return match ? match[1] : '$';
        }
        return '$';
    };

    const currencySymbol = getCurrencySymbol();

    /**
     * Initialize cart quantity inputs
     */
    function initializeCart() {
        const quantityInputs = document.querySelectorAll('.quantity-input');

        if (quantityInputs.length === 0) {
            return; // Not on cart page
        }

        quantityInputs.forEach(input => {
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

            // Track changes and debounce updates
            input.addEventListener('input', function () {
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
        });
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
                // Calculate new item subtotal immediately for instant feedback
                const itemSubtotal = quantity * unitPrice;
                const subtotalElement = document.querySelector(`.item-subtotal[data-item-id="${itemId}"]`);
                if (subtotalElement) {
                    subtotalElement.textContent = currencySymbol + itemSubtotal.toFixed(2);
                }

                // Fetch updated cart totals from server
                await updateCartTotals();
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
