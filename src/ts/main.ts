// Product, Cart, and UI logic for Product List with Cart
interface Product {
  image: { thumbnail: string; mobile: string; tablet: string; desktop: string };
  name: string;
  category: string;
  price: number;
}
interface CartItem {
  product: Product;
  quantity: number;
}

const productListEl = document.getElementById('product-list') as HTMLElement;
const cartItemsEl = document.getElementById('cart-items') as HTMLElement;
const cartQuantityEl = document.getElementById('cart-quantity') as HTMLElement;
const cartTotalEl = document.getElementById('cart-total') as HTMLElement;
const cartSummaryEl = document.getElementById('cart-summary') as HTMLElement;
const checkoutBtn = document.getElementById('checkout-btn') as HTMLButtonElement;
const orderConfirmationEl = document.getElementById('order-confirmation') as HTMLElement;
const orderBackBtn = document.getElementById('order-back-btn') as HTMLButtonElement;
const headerCartIcon = document.getElementById('header-cart-icon') as HTMLElement;
const headerCartCount = document.getElementById('header-cart-count') as HTMLElement;
const cartDrawer = document.getElementById('cart') as HTMLElement;
const cartCloseBtn = document.getElementById('cart-close-btn') as HTMLButtonElement;

let products: Product[] = [];
let cart: CartItem[] = [];

// --- Fetch and Render Products ---
async function loadProducts() {
  const res = await fetch('./data.json');
  products = await res.json();
  renderProductList();
}

function renderProductList() {
  productListEl.innerHTML = '';
  products.forEach((product, idx) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image.thumbnail}" alt="${product.name}">
      <div class="product-name">${product.name}</div>
      <div class="product-category">${product.category}</div>
      <div class="product-price">$${product.price.toFixed(2)}</div>
      <button class="add-to-cart-btn" data-idx="${idx}">
        <img src="./assets/images/icon-add-to-cart.svg" alt="Add to cart" style="width:18px;"> Add to Cart
      </button>
    `;
    card.querySelector('.add-to-cart-btn')!.addEventListener('click', () => addToCart(idx));
    productListEl.appendChild(card);
  });
}

// --- Cart Logic ---
function addToCart(productIdx: number) {
  const product = products[productIdx];
  const found = cart.find(item => item.product.name === product.name);
  if (found) {
    found.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }
  renderCart();
}

function removeFromCart(productName: string) {
  cart = cart.filter(item => item.product.name !== productName);
  renderCart();
}

function updateCartQuantity(productName: string, delta: number) {
  const item = cart.find(item => item.product.name === productName);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productName);
  } else {
    renderCart();
  }
}

function openCartDrawer() {
  cartDrawer.classList.add('open');
}
function closeCartDrawer() {
  cartDrawer.classList.remove('open');
}
headerCartIcon.addEventListener('click', openCartDrawer);
cartCloseBtn.addEventListener('click', closeCartDrawer);

function renderCart() {
  cartItemsEl.innerHTML = '';
  if (cart.length === 0) {
    cartItemsEl.classList.add('empty');
    cartItemsEl.innerHTML = `
      <img src="./assets/images/illustration-empty-cart.svg" alt="Empty cart illustration" class="empty-cart-img">
      <p class="empty-cart-text">Your added items will appear here</p>
    `;
    cartSummaryEl.style.display = 'none';
  } else {
    cartItemsEl.classList.remove('empty');
    cart.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img src="${item.product.image.thumbnail}" alt="${item.product.name}">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.product.name}</div>
          <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="cart-item-qty-btn" title="Decrease">-</button>
            <span>${item.quantity}</span>
            <button class="cart-item-qty-btn" title="Increase">+</button>
          </div>
        </div>
        <button class="cart-item-remove-btn" title="Remove">&times;</button>
      `;
      const [decBtn, incBtn] = el.querySelectorAll('.cart-item-qty-btn');
      decBtn.addEventListener('click', () => updateCartQuantity(item.product.name, -1));
      incBtn.addEventListener('click', () => updateCartQuantity(item.product.name, 1));
      el.querySelector('.cart-item-remove-btn')!.addEventListener('click', () => removeFromCart(item.product.name));
      cartItemsEl.appendChild(el);
    });
    cartSummaryEl.style.display = 'flex';
  }
  // Update cart quantity and total
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  cartQuantityEl.textContent = totalQty.toString();
  cartTotalEl.textContent = `$${totalPrice.toFixed(2)}`;
  headerCartCount.textContent = totalQty.toString();
}

// --- Checkout and Order Confirmation ---
checkoutBtn.addEventListener('click', () => {
  closeCartDrawer();
  document.querySelector('main')!.scrollTo(0, 0);
  (document.getElementById('products') as HTMLElement).style.display = 'none';
  orderConfirmationEl.style.display = 'flex';
  cart = [];
  renderCart();
});
orderBackBtn.addEventListener('click', () => {
  (document.getElementById('products') as HTMLElement).style.display = '';
  orderConfirmationEl.style.display = 'none';
  openCartDrawer();
});

// --- Responsive Burger Menu (optional) ---
const burgerMenu = document.getElementById('burger-menu');
const nav = document.querySelector('nav ul');
if (burgerMenu && nav) {
  burgerMenu.addEventListener('click', () => {
    nav.classList.toggle('nav-active');
  });
}

// --- Initial Load ---
loadProducts();
renderCart();
