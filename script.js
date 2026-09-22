document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       GLOBAL STATE
    ========================= */

    let currentProduct = 0;
    let heroSide = "front";

    let selectedProduct = null;
    let selectedSize = null;
    let modalSide = "front";

    let cart = JSON.parse(
        localStorage.getItem("redDragonCart")
    ) || [];


    /* =========================
       ELEMENTS
    ========================= */

    const loader =
        document.getElementById("loader");

    const heroImage =
        document.getElementById("hero-image");

    const heroProduct =
        document.getElementById("hero-product");

    const heroNumber =
        document.getElementById("hero-number");

    const switchers =
        document.querySelectorAll(".switcher");

    const nextProduct =
        document.getElementById("next-product");

    const productsGrid =
        document.getElementById("products-grid");

    const modal =
        document.getElementById("product-modal");

    const modalImage =
        document.getElementById("modal-product-image");

    const cartDrawer =
        document.getElementById("cart-drawer");

    const cartOverlay =
        document.getElementById("cart-overlay");

    const cartItems =
        document.getElementById("cart-items");

    const cartCount =
        document.getElementById("cart-count");

    const cartTotal =
        document.getElementById("cart-total");


    /* =========================
       LOADER
    ========================= */

    // Keep the cinematic intro visible long enough to feel intentional.
    // The loading bar and intro finish together, then the existing site is revealed.
    setTimeout(() => {

        if (loader) {
            loader.classList.add("hide");
            document.body.classList.remove("intro-active");

            setTimeout(() => {
                loader.remove();
            }, 850);
        }

    }, 3000);


    /* =========================
       HERO
    ========================= */

    function updateHeroRotationButtons() {

        const frontButton =
            document.getElementById("hero-front");

        const backButton =
            document.getElementById("hero-back");

        if (frontButton) {
            frontButton.classList.toggle(
                "active",
                heroSide === "front"
            );
        }

        if (backButton) {
            backButton.classList.toggle(
                "active",
                heroSide === "back"
            );
        }
    }


    /* =========================================
       SMOOTH HERO ROTATION ENGINE
    ========================================= */

    let heroRotation = 0;
    let heroDragging = false;
    let heroPointerId = null;
    let heroDragStartX = 0;
    let heroDragStartRotation = 0;
    let heroLastRenderedSide = "front";

    function normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }

    function sideForRotation(angle) {
        const normalized = normalizeAngle(angle);
        return normalized >= 90 && normalized < 270
            ? "back"
            : "front";
    }

    function nearestRotationForSide(side) {
        const base = side === "back" ? 180 : 0;
        const turns = Math.round((heroRotation - base) / 360);
        return base + turns * 360;
    }

    function renderHeroRotation(angle, animate = false) {
        if (!heroProduct || !heroImage) return;

        const product = products[currentProduct];
        if (!product) return;

        heroRotation = angle;

        heroProduct.classList.toggle("dragging", heroDragging);
        heroProduct.classList.toggle("smooth-snap", animate);
        heroProduct.style.setProperty("--hero-rotation", `${heroRotation}deg`);

        const visibleSide = sideForRotation(heroRotation);

        if (visibleSide !== heroLastRenderedSide) {
            heroLastRenderedSide = visibleSide;
            heroSide = visibleSide;
            heroImage.src = product[visibleSide];
            updateHeroRotationButtons();
        }

        heroImage.classList.toggle("showing-back", visibleSide === "back");
    }

    function rotateHero(side) {
        if (!heroProduct || !heroImage) return;
        if (!products[currentProduct]) return;

        const target = nearestRotationForSide(side);
        const currentSide = sideForRotation(heroRotation);

        if (currentSide === side && Math.abs(target - heroRotation) < 0.5) {
            return;
        }

        heroSide = side;
        heroLastRenderedSide = side;
        heroImage.src = products[currentProduct][side];
        heroImage.classList.toggle("showing-back", side === "back");
        updateHeroRotationButtons();

        renderHeroRotation(target, true);

        window.setTimeout(() => {
            if (heroProduct) {
                heroProduct.classList.remove("smooth-snap");
            }
        }, 520);
    }


    function changeHeroProduct(index) {
        if (!products[index]) return;

        currentProduct = index;
        const product = products[index];

        if (heroProduct) {
            heroProduct.classList.add("changing");
        }

        window.setTimeout(() => {
            heroSide = "front";
            heroLastRenderedSide = "front";
            heroRotation = Math.round(heroRotation / 360) * 360;

            if (heroImage) {
                heroImage.src = product.front;
                heroImage.classList.remove("showing-back");
            }

            if (heroNumber) {
                heroNumber.textContent = product.number;
            }

            renderHeroRotation(heroRotation, false);
            updateHeroRotationButtons();

            if (heroProduct) {
                heroProduct.classList.remove("changing");
            }
        }, 180);

        switchers.forEach((button, buttonIndex) => {
            button.classList.toggle("active", buttonIndex === index);
        });
    }


    /* =========================================
       HERO BUTTONS
    ========================================= */

    const heroFront = document.getElementById("hero-front");
    const heroBack = document.getElementById("hero-back");

    if (heroFront) {
        heroFront.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            rotateHero("front");
        });
    }

    if (heroBack) {
        heroBack.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            rotateHero("back");
        });
    }

    switchers.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const index = Number(button.dataset.product);
            if (!Number.isNaN(index)) {
                changeHeroProduct(index);
            }
        });
    });

    if (nextProduct) {
        nextProduct.addEventListener("click", () => {
            const nextIndex = (currentProduct + 1) % products.length;
            changeHeroProduct(nextIndex);
        });
    }


    /* =========================================
       MANUAL DRAG ROTATION - STICKING FIX
       Global release listeners guarantee that the
       shirt always snaps to FRONT or BACK.
    ========================================= */

    if (heroProduct) {
        let dragMoved = false;

        const finishHeroDrag = event => {
            if (!heroDragging) return;
            if (event && heroPointerId !== null && event.pointerId !== undefined && event.pointerId !== heroPointerId) return;

            heroDragging = false;
            dragMoved = false;

            if (heroPointerId !== null) {
                try { heroProduct.releasePointerCapture(heroPointerId); } catch (error) {}
            }
            heroPointerId = null;
            heroProduct.classList.remove("dragging");

            /* Never leave the product edge-on. Always finish at 0 or 180 degrees. */
            const normalized = normalizeAngle(heroRotation);
            const snappedSide = normalized >= 90 && normalized < 270 ? "back" : "front";
            const snappedRotation = nearestRotationForSide(snappedSide);

            heroSide = snappedSide;
            heroLastRenderedSide = snappedSide;
            heroImage.src = products[currentProduct][snappedSide];
            heroImage.classList.toggle("showing-back", snappedSide === "back");
            updateHeroRotationButtons();

            renderHeroRotation(snappedRotation, true);

            window.setTimeout(() => {
                heroProduct.classList.remove("smooth-snap");
            }, 380);
        };

        heroProduct.addEventListener("pointerdown", event => {
            if (event.target.closest("button, a")) return;
            if (event.pointerType === "mouse" && event.button !== 0) return;

            heroDragging = true;
            dragMoved = false;
            heroPointerId = event.pointerId;
            heroDragStartX = event.clientX;
            heroDragStartRotation = heroRotation;

            heroProduct.classList.remove("smooth-snap");
            heroProduct.classList.add("dragging");

            try { heroProduct.setPointerCapture(event.pointerId); } catch (error) {}
        });

        heroProduct.addEventListener("pointermove", event => {
            if (!heroDragging || event.pointerId !== heroPointerId) return;

            const deltaX = event.clientX - heroDragStartX;
            if (Math.abs(deltaX) > 3) dragMoved = true;

            /* Slightly slower rotation avoids jumping past a face on phones. */
            const nextRotation = heroDragStartRotation + deltaX * 0.55;
            renderHeroRotation(nextRotation, false);
        });

        heroProduct.addEventListener("pointerup", finishHeroDrag);
        heroProduct.addEventListener("pointercancel", finishHeroDrag);
        heroProduct.addEventListener("lostpointercapture", finishHeroDrag);

        /* Fallbacks: release outside the shirt, browser interruption, or app switch. */
        window.addEventListener("pointerup", finishHeroDrag, true);
        window.addEventListener("pointercancel", finishHeroDrag, true);
        window.addEventListener("blur", () => finishHeroDrag(null));
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) finishHeroDrag(null);
        });
    }

    /* =========================================
       SUBTLE DESKTOP TILT WITHOUT BREAKING DRAG
    ========================================= */

    document.addEventListener("mousemove", event => {
        if (window.innerWidth < 768 || !heroProduct || heroDragging) return;

        const rect = heroProduct.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const tiltY = Math.max(-5, Math.min(5, (event.clientX - centerX) / 90));
        const tiltX = Math.max(-4, Math.min(4, -(event.clientY - centerY) / 110));

        heroProduct.style.setProperty("--hero-tilt-x", `${tiltX}deg`);
        heroProduct.style.setProperty("--hero-tilt-y", `${tiltY}deg`);
    });

    if (heroProduct) {
        heroProduct.addEventListener("mouseleave", () => {
            if (heroDragging) return;
            heroProduct.style.setProperty("--hero-tilt-x", "0deg");
            heroProduct.style.setProperty("--hero-tilt-y", "0deg");
        });
    }

    /* =========================
       PARTICLES
    ========================= */

    const particles =
        document.getElementById("particles");

    if (particles) {

        for (let i = 0; i < 35; i++) {

            const particle =
                document.createElement("span");

            particle.style.left =
                Math.random() * 100 + "%";

            particle.style.top =
                Math.random() * 100 + "%";

            particle.style.animationDelay =
                Math.random() * 8 + "s";

            particle.style.animationDuration =
                5 +
                Math.random() * 8 +
                "s";

            particles.appendChild(
                particle
            );
        }
    }


    /* =========================
       PRODUCT GRID
    ========================= */

    function renderProducts() {

        if (!productsGrid) return;

        productsGrid.innerHTML = "";

        products.forEach(product => {

            const card =
                document.createElement("article");

            card.className =
                "product-card";

            card.dataset.side =
                "back";

            card.innerHTML = `

                <div class="product-card-image">

                    <span class="card-number">
                        ${product.number}
                    </span>

                    <img
                        class="card-product-image"
                        src="${product.back}"
                        alt="${product.name}"
                    >

                    <div class="card-views">

                        <button
                            class="card-view"
                            data-side="front"
                            type="button"
                        >
                            FRONT
                        </button>

                        <button
                            class="card-view active"
                            data-side="back"
                            type="button"
                        >
                            BACK
                        </button>

                    </div>

                    <button
                        class="quick-view"
                        data-id="${product.id}"
                        type="button"
                    >
                        VIEW PRODUCT →
                    </button>

                </div>

                <div class="product-card-info">

                    <div>

                        <span>
                            RED DRAGON /
                            DROP ${product.number}
                        </span>

                        <h3>
                            ${product.name}
                        </h3>

                    </div>

                    <strong>
                        ₹${product.price}
                    </strong>

                </div>

            `;

            productsGrid.appendChild(card);

        });

        addProductCardEvents();
    }


    /* =========================
       PRODUCT CARD EVENTS
    ========================= */

    function addProductCardEvents() {

        document
            .querySelectorAll(".product-card")
            .forEach(card => {

                const quickView =
                    card.querySelector(
                        ".quick-view"
                    );

                if (!quickView) return;

                const productId =
                    Number(
                        quickView.dataset.id
                    );

                const product =
                    products.find(
                        item =>
                            item.id ===
                            productId
                    );

                if (!product) return;

                const image =
                    card.querySelector(
                        ".card-product-image"
                    );


                card
                    .querySelectorAll(
                        ".card-view"
                    )
                    .forEach(button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const side =
                                    button.dataset.side;

                                if (
                                    card.dataset.side ===
                                    side
                                ) return;

                                image.classList.add(
                                    "card-flip"
                                );

                                setTimeout(() => {

                                    image.src =
                                        product[side];

                                    card.dataset.side =
                                        side;

                                    card
                                        .querySelectorAll(
                                            ".card-view"
                                        )
                                        .forEach(
                                            btn =>
                                                btn.classList
                                                    .remove(
                                                        "active"
                                                    )
                                        );

                                    button.classList.add(
                                        "active"
                                    );

                                }, 200);

                                setTimeout(() => {

                                    image.classList.remove(
                                        "card-flip"
                                    );

                                }, 400);

                            }
                        );

                    });


                quickView.addEventListener(
                    "click",
                    () => {

                        selectedProduct =
                            product;

                        openProductModal();

                    }
                );

            });
    }


    /* =========================
       PRODUCT MODAL
    ========================= */

    function openProductModal() {

        if (
            !modal ||
            !modalImage ||
            !selectedProduct
        ) return;

        modalSide = "back";

        modalImage.src =
            selectedProduct.back;


        const name =
            document.getElementById(
                "modal-product-name"
            );

        const description =
            document.getElementById(
                "modal-product-description"
            );

        const price =
            document.getElementById(
                "modal-product-price"
            );

        const number =
            document.getElementById(
                "modal-product-number"
            );


        if (name) {
            name.textContent =
                selectedProduct.name;
        }

        if (description) {
            description.textContent =
                selectedProduct.description;
        }

        if (price) {
            price.textContent =
                "₹" +
                selectedProduct.price;
        }

        if (number) {
            number.textContent =
                "RED DRAGON / DROP " +
                selectedProduct.number;
        }


        selectedSize = null;


        document
            .querySelectorAll(
                ".size-button"
            )
            .forEach(button => {

                button.classList.remove(
                    "selected"
                );

            });


        const modalFront =
            document.getElementById(
                "modal-front"
            );

        const modalBack =
            document.getElementById(
                "modal-back"
            );


        if (modalFront) {
            modalFront.classList.remove(
                "active"
            );
        }

        if (modalBack) {
            modalBack.classList.add(
                "active"
            );
        }


        modal.classList.add("show");

        document.body.style.overflow =
            "hidden";
    }


    function rotateModal(side) {

        if (
            !selectedProduct ||
            !modalImage
        ) return;

        if (modalSide === side) return;

        modalImage.classList.add(
            "modal-flipping"
        );


        setTimeout(() => {

            modalSide = side;

            modalImage.src =
                selectedProduct[side];


            const modalFront =
                document.getElementById(
                    "modal-front"
                );

            const modalBack =
                document.getElementById(
                    "modal-back"
                );


            if (modalFront) {

                modalFront.classList.toggle(
                    "active",
                    side === "front"
                );

            }


            if (modalBack) {

                modalBack.classList.toggle(
                    "active",
                    side === "back"
                );

            }

        }, 250);


        setTimeout(() => {

            modalImage.classList.remove(
                "modal-flipping"
            );

        }, 500);
    }


    const modalFront =
        document.getElementById(
            "modal-front"
        );

    const modalBack =
        document.getElementById(
            "modal-back"
        );


    if (modalFront) {

        modalFront.addEventListener(
            "click",
            () => rotateModal("front")
        );

    }


    if (modalBack) {

        modalBack.addEventListener(
            "click",
            () => rotateModal("back")
        );

    }


    /* =========================
       MODAL DRAG
    ========================= */

    let modalStartX = 0;

    if (modalImage) {

        modalImage.addEventListener(
            "pointerdown",
            event => {

                modalStartX =
                    event.clientX;

            }
        );


        modalImage.addEventListener(
            "pointerup",
            event => {

                const difference =
                    event.clientX -
                    modalStartX;

                if (difference > 40) {
                    rotateModal("front");
                }

                if (difference < -40) {
                    rotateModal("back");
                }

            }
        );

    }


    /* =========================
       CLOSE MODAL
    ========================= */

    function closeProductModal() {

        if (!modal) return;

        modal.classList.remove("show");

        document.body.style.overflow = "";
    }


    const modalClose =
        document.getElementById(
            "modal-close"
        );

    const modalOverlay =
        document.getElementById(
            "modal-overlay"
        );


    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeProductModal
        );

    }


    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            closeProductModal
        );

    }


    /* =========================
       SIZE SELECTION
    ========================= */

    document
        .querySelectorAll(
            ".size-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".size-button"
                        )
                        .forEach(btn => {

                            btn.classList.remove(
                                "selected"
                            );

                        });


                    button.classList.add(
                        "selected"
                    );

                    selectedSize =
                        button.textContent
                            .trim();

                }
            );

        });


    /* =========================
       TOAST
    ========================= */

    function showToast(message) {

        let toast =
            document.getElementById(
                "toast"
            );

        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );

            toast.id = "toast";

            toast.className = "toast";

            document.body.appendChild(
                toast
            );
        }

        toast.textContent =
            message;

        toast.classList.add(
            "show"
        );

        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);
    }


    /* =========================
       ADD TO CART
    ========================= */

    const addCartButton =
        document.getElementById(
            "add-cart-button"
        );


    if (addCartButton) {

        addCartButton.addEventListener(
            "click",
            () => {

                if (!selectedProduct) {
                    return;
                }


                if (!selectedSize) {

                    showToast(
                        "PLEASE SELECT A SIZE"
                    );

                    return;
                }


                const existingItem =
                    cart.find(
                        item =>
                            item.id ===
                            selectedProduct.id &&
                            item.size ===
                            selectedSize
                    );


                if (existingItem) {

                    existingItem.quantity++;

                } else {

                    cart.push({

                        id:
                            selectedProduct.id,

                        name:
                            selectedProduct.name,

                        price:
                            selectedProduct.price,

                        image:
                            selectedProduct.front,

                        size:
                            selectedSize,

                        quantity: 1

                    });

                }


                saveCart();

                renderCart();

                showToast(
                    "ADDED TO CART"
                );


                if (modal) {
                    closeProductModal();
                }

            }
        );

    }


    /* =========================
       SAVE CART
    ========================= */

    function saveCart() {

        localStorage.setItem(
            "redDragonCart",
            JSON.stringify(cart)
        );

    }


    /* =========================
       CART
    ========================= */

    function renderCart() {

        if (!cartItems) return;

        cartItems.innerHTML = "";


        if (cart.length === 0) {

            cartItems.innerHTML = `
                <div class="empty-cart">
                    YOUR CART IS EMPTY
                </div>
            `;

            updateCartSummary();

            return;
        }


        cart.forEach(
            (item, index) => {

                const cartItem =
                    document.createElement(
                        "div"
                    );

                cartItem.className =
                    "cart-item";


                cartItem.innerHTML = `

                    <img
                        src="${item.image}"
                        alt="${item.name}"
                    >

                    <div class="cart-item-info">

                        <h3>
                            ${item.name}
                        </h3>

                        <span>
                            SIZE: ${item.size}
                        </span>

                        <strong>
                            ₹${item.price}
                        </strong>

                        <div class="quantity-controls">

                            <button
                                type="button"
                                data-action="minus"
                                data-index="${index}"
                            >
                                −
                            </button>

                            <span>
                                ${item.quantity}
                            </span>

                            <button
                                type="button"
                                data-action="plus"
                                data-index="${index}"
                            >
                                +
                            </button>

                            <button
                                type="button"
                                class="remove-item"
                                data-action="remove"
                                data-index="${index}"
                            >
                                REMOVE
                            </button>

                        </div>

                    </div>

                `;


                cartItems.appendChild(
                    cartItem
                );

            }
        );


        cartItems
            .querySelectorAll(
                "[data-action]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset.action;

                        const index =
                            Number(
                                button.dataset.index
                            );


                        if (
                            index < 0 ||
                            index >= cart.length
                        ) {
                            return;
                        }


                        if (action === "minus") {

                            cart[index].quantity--;

                            if (
                                cart[index].quantity <=
                                0
                            ) {

                                cart.splice(
                                    index,
                                    1
                                );

                            }

                        }


                        if (action === "plus") {

                            cart[index].quantity++;

                        }


                        if (action === "remove") {

                            cart.splice(
                                index,
                                1
                            );

                        }


                        saveCart();

                        renderCart();

                    }
                );

            });


        updateCartSummary();
    }


    function updateCartSummary() {

        let quantity = 0;
        let total = 0;


        cart.forEach(item => {

            quantity +=
                item.quantity;

            total +=
                item.price *
                item.quantity;

        });


        if (cartCount) {

            cartCount.textContent =
                quantity;

        }


        if (cartTotal) {

            cartTotal.textContent =
                "₹" + total;

        }

    }


    /* =========================
       OPEN / CLOSE CART
    ========================= */

    function openCart() {

        if (cartDrawer) {
            cartDrawer.classList.add(
                "open"
            );
        }

        if (cartOverlay) {
            cartOverlay.classList.add(
                "show"
            );
        }

        document.body.style.overflow =
            "hidden";
    }


    function closeCart() {

        if (cartDrawer) {
            cartDrawer.classList.remove(
                "open"
            );
        }

        if (cartOverlay) {
            cartOverlay.classList.remove(
                "show"
            );
        }

        document.body.style.overflow =
            "";
    }


    const openCartButton =
        document.getElementById(
            "open-cart"
        );

    const closeCartButton =
        document.getElementById(
            "close-cart"
        );


    if (openCartButton) {

        openCartButton.addEventListener(
            "click",
            openCart
        );

    }


    if (closeCartButton) {

        closeCartButton.addEventListener(
            "click",
            closeCart
        );

    }


    if (cartOverlay) {

        cartOverlay.addEventListener(
            "click",
            closeCart
        );

    }


        /* =========================
       CHECKOUT + PREPAID / COD
    ========================= */

    const checkoutButton = document.getElementById("checkout-button");
    const checkoutModal = document.getElementById("checkout-modal");
    const checkoutModalOverlay = document.getElementById("checkout-modal-overlay");
    const checkoutClose = document.getElementById("checkout-close");
    const checkoutDetailsStep = document.getElementById("checkout-details-step");
    const checkoutPaymentStep = document.getElementById("checkout-payment-step");
    const checkoutSuccessStep = document.getElementById("checkout-success-step");
    const checkoutDetailsForm = document.getElementById("checkout-details-form");
    const utrForm = document.getElementById("utr-form");
    const checkoutOrderPreview = document.getElementById("checkout-order-preview");
    const checkoutPayTotal = document.getElementById("checkout-pay-total");
    const checkoutDoneButton = document.getElementById("checkout-done-button");
    const copyUpiButton = document.getElementById("copy-upi-button");
    const storeUpiIdElement = document.getElementById("store-upi-id");
    const paymentMethodInput = document.getElementById("payment-method");
    const paymentMethodButtons = document.querySelectorAll(".payment-method-button");
    const paymentOrderId = document.getElementById("payment-order-id");
    const successOrderId = document.getElementById("success-order-id");
    const checkoutSuccessMessage = document.getElementById("checkout-success-message");
    const whatsappOrderButton = document.getElementById("whatsapp-order-button");

    const STORE_UPI_ID = "8919131887@axl";
    const STORE_WHATSAPP_NUMBER = "918919131887";
    const COD_SHIPPING_CHARGE = 49;

    /* Existing Formspree endpoint from your earlier order flow. */
    const ORDER_FORM_ENDPOINT = "https://formspree.io/f/xkjwpylo";

    let checkoutCustomer = null;
    let checkoutOrderId = null;
    let selectedPaymentMethod = "prepaid";

    if (storeUpiIdElement) {
        storeUpiIdElement.textContent = STORE_UPI_ID;
    }


    function updateWhatsAppOrderButton(extraText = "") {
        if (!whatsappOrderButton || !checkoutOrderId) return;

        const total = cartAmount();
        const customerName = checkoutCustomer?.name || "Customer";
        const message =
            `Hi Red Dragon Streetwear, I have placed an order.\n\n` +
            `Order ID: ${checkoutOrderId}\n` +
            `Name: ${customerName}\n` +
            `Payment: ${paymentMethodLabel()}\n` +
            `Total: ₹${total}` +
            (extraText ? `\n${extraText}` : "") +
            `\n\nPlease confirm my order status.`;

        whatsappOrderButton.href =
            `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }

    function generateOrderId() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const random = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `RD-${y}${m}${d}-${random}`;
    }

    function cartSubtotal() {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function shippingCharge() {
        return selectedPaymentMethod === "cod" ? COD_SHIPPING_CHARGE : 0;
    }

    function cartAmount() {
        return cartSubtotal() + shippingCharge();
    }

    function paymentMethodLabel() {
        return selectedPaymentMethod === "cod" ? "Cash on Delivery (COD)" : "Prepaid UPI";
    }

    function orderSummaryText() {
        return cart.map(item =>
            `${item.name} | Size: ${item.size} | Qty: ${item.quantity} | ₹${item.price * item.quantity}`
        ).join("\n");
    }

    function renderCheckoutPreview() {
        if (!checkoutOrderPreview) return;

        checkoutOrderPreview.innerHTML = `
            <div class="checkout-preview-title">ORDER SUMMARY</div>
            ${cart.map(item => `
                <div class="checkout-preview-row">
                    <span>${item.name} × ${item.quantity} <small>SIZE ${item.size}</small></span>
                    <strong>₹${item.price * item.quantity}</strong>
                </div>
            `).join("")}
            <div class="checkout-preview-row checkout-charge-row">
                <span>SUBTOTAL</span>
                <strong>₹${cartSubtotal()}</strong>
            </div>
            <div class="checkout-preview-row checkout-charge-row">
                <span>SHIPPING ${selectedPaymentMethod === "cod" ? "(COD)" : ""}</span>
                <strong>${shippingCharge() ? `₹${shippingCharge()}` : "FREE"}</strong>
            </div>
            <div class="checkout-preview-total">
                <span>TOTAL</span>
                <strong>₹${cartAmount()}</strong>
            </div>
        `;

        if (checkoutPayTotal) checkoutPayTotal.textContent = `₹${cartAmount()}`;
        if (paymentOrderId) paymentOrderId.textContent = checkoutOrderId || "—";
    }

    function setPaymentMethod(method) {
        selectedPaymentMethod = method === "cod" ? "cod" : "prepaid";
        if (paymentMethodInput) paymentMethodInput.value = selectedPaymentMethod;

        paymentMethodButtons.forEach(button => {
            const active = button.dataset.paymentMethod === selectedPaymentMethod;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderCheckoutPreview();
    }

    paymentMethodButtons.forEach(button => {
        button.addEventListener("click", () => setPaymentMethod(button.dataset.paymentMethod));
    });

    function setCheckoutStep(step) {
        [checkoutDetailsStep, checkoutPaymentStep, checkoutSuccessStep].forEach(section => {
            if (section) section.classList.remove("active");
        });
        if (step) step.classList.add("active");
    }

    function openCheckout() {
        if (cart.length === 0) {
            showToast("YOUR CART IS EMPTY");
            return;
        }

        checkoutOrderId = generateOrderId();
        selectedPaymentMethod = "prepaid";
        setPaymentMethod("prepaid");
        renderCheckoutPreview();
        closeCart();
        setCheckoutStep(checkoutDetailsStep);

        if (checkoutModal) {
            checkoutModal.classList.add("show");
            checkoutModal.setAttribute("aria-hidden", "false");
        }
        document.body.style.overflow = "hidden";
    }

    function closeCheckout() {
        if (checkoutModal) {
            checkoutModal.classList.remove("show");
            checkoutModal.setAttribute("aria-hidden", "true");
        }
        document.body.style.overflow = "";
    }

    async function sendOrderEmail(subject, message, customer) {
        const formData = new FormData();
        formData.append("_subject", subject);
        formData.append("order_id", checkoutOrderId || "");
        formData.append("payment_method", paymentMethodLabel());
        formData.append("name", customer?.name || "");
        formData.append("email", customer?.email || "");
        formData.append("phone", customer?.phone || "");
        formData.append("message", message);

        const response = await fetch(ORDER_FORM_ENDPOINT, {
            method: "POST",
            body: formData,
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || "Order submission failed");
        }
    }

    if (checkoutButton) checkoutButton.addEventListener("click", openCheckout);
    if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
    if (checkoutModalOverlay) checkoutModalOverlay.addEventListener("click", closeCheckout);

    if (copyUpiButton) {
        copyUpiButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(STORE_UPI_ID);
                showToast("UPI ID COPIED");
            } catch (error) {
                showToast("COPY THE UPI ID MANUALLY");
            }
        });
    }

    if (checkoutDetailsForm) {
        checkoutDetailsForm.addEventListener("submit", async event => {
            event.preventDefault();

            const submitButton = document.getElementById("continue-payment-button");
            const data = new FormData(checkoutDetailsForm);

            checkoutCustomer = {
                name: String(data.get("name") || "").trim(),
                email: String(data.get("email") || "").trim(),
                phone: String(data.get("phone") || "").trim(),
                address: String(data.get("address") || "").trim(),
                city: String(data.get("city") || "").trim(),
                state: String(data.get("state") || "").trim(),
                pincode: String(data.get("pincode") || "").trim(),
                landmark: String(data.get("landmark") || "").trim()
            };

            if (!checkoutOrderId) checkoutOrderId = generateOrderId();

            const message = `NEW ORDER\n\n` +
                `Order ID: ${checkoutOrderId}\n` +
                `Payment Method: ${paymentMethodLabel()}\n\n` +
                `CUSTOMER DETAILS\n` +
                `Name: ${checkoutCustomer.name}\n` +
                `Email: ${checkoutCustomer.email}\n` +
                `Phone: ${checkoutCustomer.phone}\n` +
                `Address: ${checkoutCustomer.address}\n` +
                `City: ${checkoutCustomer.city}\n` +
                `State: ${checkoutCustomer.state}\n` +
                `PIN: ${checkoutCustomer.pincode}\n` +
                `Landmark: ${checkoutCustomer.landmark || "N/A"}\n\n` +
                `ORDER\n${orderSummaryText()}\n\n` +
                `Subtotal: ₹${cartSubtotal()}\n` +
                `Shipping: ${shippingCharge() ? `₹${shippingCharge()}` : "FREE"}\n` +
                `TOTAL: ₹${cartAmount()}\n\n` +
                `Status: ${selectedPaymentMethod === "cod" ? "COD ORDER RECEIVED" : "WAITING FOR UPI PAYMENT / UTR"}`;

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = selectedPaymentMethod === "cod" ? "PLACING COD ORDER..." : "SAVING DETAILS...";
                }

                await sendOrderEmail(
                    `${selectedPaymentMethod === "cod" ? "COD Order" : "New Red Dragon Checkout"} - ${checkoutOrderId} - ${checkoutCustomer.name}`,
                    message,
                    checkoutCustomer
                );

                if (selectedPaymentMethod === "cod") {
                    if (successOrderId) successOrderId.textContent = checkoutOrderId;
                    if (checkoutSuccessMessage) checkoutSuccessMessage.textContent = "Your Cash on Delivery order has been received. ₹49 shipping has been included in the total. We will process the order using the details you submitted.";
                    updateWhatsAppOrderButton("Order type: Cash on Delivery");
                    cart = [];
                    saveCart();
                    renderCart();
                    setCheckoutStep(checkoutSuccessStep);
                } else {
                    if (paymentOrderId) paymentOrderId.textContent = checkoutOrderId;
                    if (checkoutPayTotal) checkoutPayTotal.textContent = `₹${cartAmount()}`;
                    setCheckoutStep(checkoutPaymentStep);
                }
            } catch (error) {
                console.error(error);
                showToast("COULD NOT SAVE ORDER. PLEASE TRY AGAIN");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "SAVE DETAILS & CONTINUE →";
                }
            }
        });
    }

    if (utrForm) {
        utrForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (!checkoutCustomer || selectedPaymentMethod !== "prepaid") {
                setCheckoutStep(checkoutDetailsStep);
                return;
            }

            const utrInput = document.getElementById("payment-utr");
            const submitButton = document.getElementById("submit-order-button");
            const utr = utrInput ? utrInput.value.trim() : "";

            if (utr.length < 6) {
                showToast("ENTER A VALID UTR / TRANSACTION ID");
                return;
            }

            const message = `PREPAID PAYMENT SUBMITTED - VERIFY UTR\n\n` +
                `Order ID: ${checkoutOrderId}\n` +
                `Payment Method: Prepaid UPI\n` +
                `UPI ID: ${STORE_UPI_ID}\n\n` +
                `Name: ${checkoutCustomer.name}\n` +
                `Email: ${checkoutCustomer.email}\n` +
                `Phone: ${checkoutCustomer.phone}\n` +
                `Address: ${checkoutCustomer.address}\n` +
                `City: ${checkoutCustomer.city}\n` +
                `State: ${checkoutCustomer.state}\n` +
                `PIN: ${checkoutCustomer.pincode}\n` +
                `Landmark: ${checkoutCustomer.landmark || "N/A"}\n\n` +
                `ORDER\n${orderSummaryText()}\n\n` +
                `Subtotal: ₹${cartSubtotal()}\nShipping: FREE\nTOTAL: ₹${cartAmount()}\n` +
                `UTR / Transaction ID: ${utr}\n\nStatus: PAYMENT VERIFICATION REQUIRED`;

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "SUBMITTING ORDER...";
                }

                await sendOrderEmail(
                    `Payment UTR Received - ${checkoutOrderId} - ${checkoutCustomer.name}`,
                    message,
                    checkoutCustomer
                );

                if (successOrderId) successOrderId.textContent = checkoutOrderId;
                if (checkoutSuccessMessage) checkoutSuccessMessage.textContent = "We received your prepaid order and UTR. Your order will be confirmed after the payment is manually verified.";
                updateWhatsAppOrderButton(`UTR: ${utr}`);
                cart = [];
                saveCart();
                renderCart();
                setCheckoutStep(checkoutSuccessStep);
            } catch (error) {
                console.error(error);
                showToast("UTR SUBMISSION FAILED. PLEASE TRY AGAIN");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "SUBMIT PAYMENT & PLACE ORDER →";
                }
            }
        });
    }

    if (checkoutDoneButton) {
        checkoutDoneButton.addEventListener("click", () => {
            closeCheckout();
            checkoutCustomer = null;
            checkoutOrderId = null;
            selectedPaymentMethod = "prepaid";
            if (checkoutDetailsForm) checkoutDetailsForm.reset();
            if (utrForm) utrForm.reset();
        });
    }

    /* =========================
       MOBILE MENU
    ========================= */

    const menuButton =
        document.getElementById(
            "menu-button"
        );

    const mobileMenu =
        document.getElementById(
            "mobile-menu"
        );


    if (menuButton && mobileMenu) {

        menuButton.addEventListener(
            "click",
            () => {

                mobileMenu.classList.toggle(
                    "open"
                );

            }
        );


        mobileMenu
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        mobileMenu.classList.remove(
                            "open"
                        );

                    }
                );

            });

    }


    /* =========================
       NEWSLETTER
    ========================= */

    const newsletterForm =
        document.getElementById(
            "newsletter-form"
        );


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const input =
                    newsletterForm.querySelector(
                        "input"
                    );

                if (input) {
                    input.value = "";
                }

                showToast(
                    "THANK YOU FOR JOINING THE DRAGON"
                );

            }
        );

    }


    /* =========================
       INITIALIZE
    ========================= */

    renderProducts();

    renderCart();

    updateHeroRotationButtons();

});

/* DESIGN A / V17A — pointer lighting + glass card depth */
(() => {
    const root = document.body;
    if (!root || !root.classList.contains('design-liquid-glass')) return;
    let raf = 0;
    document.addEventListener('pointermove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            root.style.setProperty('--mx', `${e.clientX}px`);
            root.style.setProperty('--my', `${e.clientY}px`);
        });
    }, { passive: true });

    const cards = document.querySelectorAll('.product-card');
    cards.forEach((card) => {
        card.addEventListener('pointermove', (e) => {
            if (window.matchMedia('(pointer: coarse)').matches) return;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - .5;
            const y = (e.clientY - r.top) / r.height - .5;
            card.style.transform = `perspective(900px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*7).toFixed(2)}deg) translateY(-6px)`;
        });
        card.addEventListener('pointerleave', () => card.style.transform = '');
    });
})();
