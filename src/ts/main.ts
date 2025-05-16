interface Dessert {
  name: string;
  category: string;
  price: number;
  image: {
    mobile: string;
    [key: string]: string;
  };
}

interface Cart {
  [key: string]: number;
}

// IndexedDB Configuration
const DB_CONFIG = {
  name: 'dessertCartDB',
  version: 2,
  stores: {
    cart: 'cart',
    settings: 'settings'
  }
} as const;

// Enhanced IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_CONFIG.stores.cart)) {
        db.createObjectStore(DB_CONFIG.stores.cart);
      }
      if (!db.objectStoreNames.contains(DB_CONFIG.stores.settings)) {
        db.createObjectStore(DB_CONFIG.stores.settings);
      }
    };
    
    request.onsuccess = () => {
      console.log('Database opened successfully');
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('Error opening database:', request.error);
      reject(request.error);
    };
  });
}

function saveCartToDB(cart: Cart): Promise<void> {
  return openDB().then(db => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(DB_CONFIG.stores.cart, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.stores.cart);
        
        store.put(cart, 'cart');
        
        tx.oncomplete = () => {
          console.log('Cart saved successfully');
          resolve();
        };
        
        tx.onerror = () => {
          console.error('Error saving cart:', tx.error);
          reject(tx.error);
        };
      } catch (error) {
        console.error('Error in saveCartToDB:', error);
        reject(error);
      } finally {
        db.close();
      }
    });
  });
}

function loadCartFromDB(): Promise<Cart> {
  return openDB().then(db => {
    return new Promise<Cart>((resolve, reject) => {
      try {
        const tx = db.transaction(DB_CONFIG.stores.cart, 'readonly');
        const store = tx.objectStore(DB_CONFIG.stores.cart);
        const request = store.get('cart');
        
        request.onsuccess = () => {
          console.log('Cart loaded successfully');
          resolve(request.result || {});
        };
        
        request.onerror = () => {
          console.error('Error loading cart:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in loadCartFromDB:', error);
        reject(error);
      } finally {
        db.close();
      }
    });
  }).catch(error => {
    console.error('Failed to load cart from IndexedDB:', error);
    return {} as Cart;
  });
}

// Clear cart from IndexedDB
function clearCartFromDB(): Promise<void> {
  return openDB().then(db => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(DB_CONFIG.stores.cart, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.stores.cart);
        
        store.delete('cart');
        
        tx.oncomplete = () => {
          console.log('Cart cleared successfully');
          resolve();
        };
        
        tx.onerror = () => {
          console.error('Error clearing cart:', tx.error);
          reject(tx.error);
        };
      } catch (error) {
        console.error('Error in clearCartFromDB:', error);
        reject(error);
      } finally {
        db.close();
      }
    });
  });
}

let cart: Cart = {};
let allItems: Dessert[] = [];
let totalCost: number = 0;

// Initialize cart from IndexedDB on page load
window.addEventListener('DOMContentLoaded', () => {
  loadCartFromDB().then(storedCart => {
    cart = storedCart;
    loadData();
    renderCart();
  }).catch(error => {
    console.error('Failed to initialize cart:', error);
    loadData();
  });
});

function loadData(): void {
  fetch('data.json')
    .then(response => response.json())
    .then((data: Dessert[]) => {
      allItems = data;
      const container = document.querySelector<HTMLElement>('.desserts-container');
      if (!container) return;
      container.innerHTML = '';
      
      data.forEach((dessert: Dessert) => {
        container.innerHTML += 
          `<div class="dessert" id='${dessert.name}'>
  
            <div class="image-container">
              <img src="${dessert.image.mobile}" alt="${dessert.category}" class="image">
              <div class="add-to-cart" id='${dessert.name}'>
                <button class="add-to-cart-btn" onclick='addToCart("${dessert.name}")'>
                  <img src="./assets/images/icon-add-to-cart.svg" alt="cart" class="add-to-cart-image">
                  <p>Add to Cart</p>
                </button>
              </div>
            </div>
  
            <div class="dessert-details">
              <p class="category">${dessert.category}</p>
              <p class="name">${dessert.name}</p>
              <p class="price">$${dessert.price}</p>
            </div>
  
          </div>`
      });
    })
}

function addToCart(itemName: string): void {
  cart[itemName] = 1;
  updateButton(itemName);
  renderCart();
  saveCartToDB(cart).catch(error => {
    console.error('Failed to save cart after adding item:', error);
  });
}

function minus(itemName: string): void {
  if (cart[itemName] > 1) {
    cart[itemName]--;
  } else {
    delete cart[itemName];
    updateButton(itemName);
  }
  renderCart();
  saveCartToDB(cart).catch(error => {
    console.error('Failed to save cart after decreasing quantity:', error);
  });
}

function plus(itemName: string): void {
  cart[itemName]++;
  renderCart();
  saveCartToDB(cart).catch(error => {
    console.error('Failed to save cart after increasing quantity:', error);
  });
}

function removeFromCart(itemName: string): void {
  delete cart[itemName];
  updateButton(itemName);
  renderCart();
  saveCartToDB(cart).catch(error => {
    console.error('Failed to save cart after removing item:', error);
  });
}

function clearCart(): void {
  cart = {};
  allItems.forEach(item => {
    updateButton(item.name);
  });
  renderCart();
  clearCartFromDB().catch(error => {
    console.error('Failed to clear cart:', error);
  });
}

function renderCart(): void {
  if (Object.keys(cart).length === 0) {
    renderEmptyCart();
    return;
  }

  const cntr = document.querySelector<HTMLElement>('.cart-items');
  if (!cntr) return;
  cntr.innerHTML = '';

  const emptyCntr = document.querySelector<HTMLElement>('.empty-cart');
  if (emptyCntr) emptyCntr.innerHTML = '';

  for (let i in cart) {
    const count = cart[i];
    const item = allItems.find(item => item.name === i);
    if (!item) continue;

    calcTotal();

    cntr.innerHTML += 
      `<div class="cart-item">
          <!--Item detaisl-->
          <div class="details">
            <p id="name">${item.name}</p>
            <div class="calculation-div">
              <p class="count"><span id="count">${count}</span>x</p>
              <p class="price-in-cart">@$<span id="price">${item.price}</span></p>
              <p class="sub-price">$<span id="sub-price">${count * item.price}</span></p>
            </div>
          </div>
          <!--Clear button-->
          <div class="clear">
            <button class="clear-btn" onclick="clearItem('${item.name}')">
              <img src="./assets/images/icon-remove-item.svg" alt="remove">
            </button>
          </div>
        </div>`;
  }
  const amountDetails = document.querySelector<HTMLElement>('.amount-details');
  if (!amountDetails) return;
  amountDetails.innerHTML = '';

  amountDetails.innerHTML += 
    `<div class="order-total">
        <p>Order Total</p>
        <p id="totalCost">$<span>${totalCost}</span></p>
      </div>
      <!--Carbon Neutral-->
      <div class="carbon-neutral">
        <img src="./assets/images/icon-carbon-neutral.svg" alt="tree">
        <p>This is a <span class='carb-neu-font'>carbon-neutral</span> delivery</p>
      </div>
      <!--Confirm Button-->
      <div class="confirm-order">
        <button class="confirm-order-btn" onclick="order()">
          <p>Confirm Order</p>
        </button>
      </div>`;
}

function order(): void {
  const orderConfirmed = document.querySelector<HTMLElement>('.order-confirmed');
  if (orderConfirmed) orderConfirmed.style.display = 'flex';
  const cntr = document.querySelector<HTMLElement>('.order-details');
  if (!cntr) return;
  cntr.innerHTML = '';

  for (let i in cart) {
    const count = cart[i];
    const item = allItems.find(item => item.name === i);
    if (!item) continue;

    calcTotal();

    cntr.innerHTML += 
      `<div class="cart-item">
          <!--Item detaisl-->
          <div class="details">
            <p id="name">${item.name}</p>
            <div class="calculation-div">
              <p class="count"><span id="count">${count}</span>x</p>
              <p class="price-in-cart">@$<span id="price">${item.price}</span></p>
              <p class="sub-price">$<span id="sub-price">${count * item.price}</span></p>
            </div>
          </div>
        </div>`;
  }
  const orderTotal = document.querySelector<HTMLElement>('.confirm-order-total');
  if (!orderTotal) return;
  orderTotal.innerHTML = '';

  orderTotal.innerHTML += 
    `<div class="order-total">
        <p>Order Total</p>
        <p id="totalCost">$<span>${totalCost}</span></p>
      </div>`;
}

function startNewOrder(): void {
  const orderConfirmed = document.querySelector<HTMLElement>('.order-confirmed');
  if (orderConfirmed) orderConfirmed.style.display = 'none';
  cart = {};
  loadData();
  renderCart();
  saveCartToDB(cart);
}

function renderEmptyCart(): void {
  const cntr = document.querySelector<HTMLElement>('.empty-cart');
  if (cntr) {
    cntr.innerHTML = 
      `<div class="empty-cart">
        <img src="./assets/images/illustration-empty-cart.svg" alt="empty" >
        <p>Your added items will appear here</p>
      </div>`;
  }

  const cartCntr = document.querySelector<HTMLElement>('.cart-items');
  if (cartCntr) cartCntr.innerHTML = '';

  const amountCntr = document.querySelector<HTMLElement>('.amount-details');
  if (amountCntr) amountCntr.innerHTML = '';
}

function calcTotal(): void {
  totalCost = 0;
  for (let i in cart) {
    const item = allItems.find(item => item.name === i);
    if (!item) continue;
    totalCost += cart[i] * item.price;
  }
}

function clearItem(itemName: string): void {
  delete cart[itemName];
  updateButton(itemName);
  renderCart();
  saveCartToDB(cart);
}

function updateButton(itemName: string): void {
  const cntr = document.getElementById(itemName);
  if (!cntr) return;
  const btn = cntr.querySelector<HTMLElement>('.add-to-cart');
  if (!btn) return;

  if (cart[itemName]) {
    const imgCntr = cntr.querySelector<HTMLElement>('.image');
    if (imgCntr) imgCntr.style.border = '2px solid hsl(14, 86%, 42%)';

    btn.innerHTML = 
      `<div class="control-btn">
          <button class="control" onclick="minus('${itemName}')">
            <img src="./assets/images/icon-decrement-quantity.svg" alt="minus">
          </button>
          <p id="quantity" class="quantity">${cart[itemName]}</p>
          <button class="control" onclick="plus('${itemName}')">
            <img src="./assets/images/icon-increment-quantity.svg" alt="plus">
          </button>
        </div>`;
  } else {
    const imgCntr = cntr.querySelector<HTMLElement>('.image');
    if (imgCntr) imgCntr.style.border = 'none';
    btn.innerHTML = 
      `<button class="add-to-cart-btn" onclick='addToCart("${itemName}")'>
        <img src="./assets/images/icon-add-to-cart.svg" alt="cart" class="add-to-cart-image">
        <p>Add to Cart</p>
      </button>`;
  }
}

loadData();
