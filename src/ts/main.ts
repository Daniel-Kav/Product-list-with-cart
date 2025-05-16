// TypeScript interfaces
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

class DessertCartApp {
  cart: Cart = {};
  allItems: Dessert[] = [];
  totalCost: number = 0;

  constructor() {
    window.addEventListener('DOMContentLoaded', () => this.initializeApp());
  }

  // --- IndexedDB helpers as static methods ---
  static openDB(): Promise<IDBDatabase> {
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

  static saveCartToDB(cart: Cart): Promise<void> {
    return DessertCartApp.openDB().then(db => {
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

  static loadCartFromDB(): Promise<Cart> {
    return DessertCartApp.openDB().then(db => {
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

  static clearCartFromDB(): Promise<void> {
    return DessertCartApp.openDB().then(db => {
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

  initializeApp(): void {
    Promise.all([DessertCartApp.loadCartFromDB(), fetch('data.json').then(res => res.json())])
      .then(([storedCart, data]: [Cart, Dessert[]]) => {
        this.cart = storedCart;
        this.allItems = data;
        const container = document.querySelector<HTMLElement>('.desserts-container');
        if (container) {
          container.innerHTML = '';
          this.allItems.forEach((dessert: Dessert) => {
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
              </div>`;
          });
        }
        Object.keys(this.cart).forEach(itemName => {
          this.updateButton(itemName);
        });
        this.renderCart();
      })
      .catch(error => {
        console.error('Failed to initialize app:', error);
        this.loadData();
      });
  }

  loadData(): void {
    fetch('data.json')
      .then(response => response.json())
      .then((data: Dessert[]) => {
        this.allItems = data;
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
        Object.keys(this.cart).forEach(itemName => {
          this.updateButton(itemName);
        });
      })
  }

  addToCart(itemName: string): void {
    this.cart[itemName] = 1;
    this.updateButton(itemName);
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart).catch(error => {
      console.error('Failed to save cart after adding item:', error);
    });
  }

  minus(itemName: string): void {
    if (this.cart[itemName] > 1) {
      this.cart[itemName]--;
      this.updateButton(itemName);
    } else {
      delete this.cart[itemName];
      this.updateButton(itemName);
    }
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart).catch(error => {
      console.error('Failed to save cart after decreasing quantity:', error);
    });
  }

  plus(itemName: string): void {
    this.cart[itemName]++;
    this.updateButton(itemName);
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart).catch(error => {
      console.error('Failed to save cart after increasing quantity:', error);
    });
  }

  removeFromCart(itemName: string): void {
    delete this.cart[itemName];
    this.updateButton(itemName);
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart).catch(error => {
      console.error('Failed to save cart after removing item:', error);
    });
  }

  clearCart(): void {
    this.cart = {};
    this.allItems.forEach((item: Dessert) => {
      this.updateButton(item.name);
    });
    this.renderCart();
    DessertCartApp.clearCartFromDB().catch(error => {
      console.error('Failed to clear cart:', error);
    });
  }

  renderCart(): void {
    if (Object.keys(this.cart).length === 0) {
      this.renderEmptyCart();
      return;
    }
    const cntr = document.querySelector<HTMLElement>('.cart-items');
    if (!cntr) return;
    cntr.innerHTML = '';
    const emptyCntr = document.querySelector<HTMLElement>('.empty-cart');
    if (emptyCntr) emptyCntr.innerHTML = '';
    for (let i in this.cart) {
      const count = this.cart[i];
      const item = this.allItems.find((item: Dessert) => item.name === i);
      if (!item) continue;
      this.calcTotal();
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
          <p id="totalCost">$<span>${this.totalCost}</span></p>
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

  order(): void {
    const orderConfirmed = document.querySelector<HTMLElement>('.order-confirmed');
    if (orderConfirmed) orderConfirmed.style.display = 'flex';
    const cntr = document.querySelector<HTMLElement>('.order-details');
    if (!cntr) return;
    cntr.innerHTML = '';
    for (let i in this.cart) {
      const count = this.cart[i];
      const item = this.allItems.find((item: Dessert) => item.name === i);
      if (!item) continue;
      this.calcTotal();
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
          <p id="totalCost">$<span>${this.totalCost}</span></p>
        </div>`;
  }

  startNewOrder(): void {
    const orderConfirmed = document.querySelector<HTMLElement>('.order-confirmed');
    if (orderConfirmed) orderConfirmed.style.display = 'none';
    this.cart = {};
    this.loadData();
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart);
    const totalElement = document.querySelector<HTMLElement>('#total');
    if (totalElement) {
      totalElement.textContent = '0';
    }
  }

  renderEmptyCart(): void {
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

  calcTotal(): void {
    this.totalCost = 0;
    for (let i in this.cart) {
      const item = this.allItems.find((item: Dessert) => item.name === i);
      if (!item) continue;
      this.totalCost += this.cart[i] * item.price;
    }
  }

  clearItem(itemName: string): void {
    delete this.cart[itemName];
    this.updateButton(itemName);
    this.renderCart();
    DessertCartApp.saveCartToDB(this.cart);
  }

  updateButton(itemName: string): void {
    const cntr = document.getElementById(itemName);
    if (!cntr) return;
    const btn = cntr.querySelector<HTMLElement>('.add-to-cart');
    if (!btn) return;
    if (this.cart[itemName]) {
      const imgCntr = cntr.querySelector<HTMLElement>('.image');
      if (imgCntr) imgCntr.style.border = '2px solid hsl(14, 86%, 42%)';
      btn.innerHTML = 
        `<div class="control-btn">
            <button class="control" onclick="minus('${itemName}')">
              <img src="./assets/images/icon-decrement-quantity.svg" alt="minus">
            </button>
            <p id="quantity" class="quantity">${this.cart[itemName]}</p>
            <button class="control" onclick="plus('${itemName}')">
              <img src="./assets/images/icon-increment-quantity.svg" alt="plus">
            </button>
          </div>`;
      const cartItem = document.querySelector(`.cart-item p[id="name"][innerHTML="${itemName}"]`)?.closest('.cart-item');
      if (cartItem) {
        const countElement = cartItem.querySelector('span[id="count"]');
        const subPriceElement = cartItem.querySelector('span[id="sub-price"]');
        const priceElement = cartItem.querySelector('span[id="price"]');
        if (countElement) countElement.textContent = this.cart[itemName].toString();
        if (subPriceElement && priceElement) {
          const price = parseFloat(priceElement.textContent || '0');
          subPriceElement.textContent = (price * this.cart[itemName]).toString();
        }
      }
    } else {
      const imgCntr = cntr.querySelector<HTMLElement>('.image');
      if (imgCntr) imgCntr.style.border = 'none';
      btn.innerHTML = 
        `<button class="add-to-cart-btn" onclick='addToCart("${itemName}")'>
          <img src="./assets/images/icon-add-to-cart.svg" alt="cart" class="add-to-cart-image">
          <p>Add to Cart</p>
        </button>`;
    }
    const totalElement = document.querySelector<HTMLElement>('#total');
    if (totalElement) {
      const totalItems = Object.values(this.cart).reduce((sum, count) => sum + count, 0);
      totalElement.textContent = totalItems.toString();
    }
  }
}

// Create a single instance and expose methods for inline event handlers
const app = new DessertCartApp();
(window as any).addToCart = app.addToCart.bind(app);
(window as any).minus = app.minus.bind(app);
(window as any).plus = app.plus.bind(app);
(window as any).clearItem = app.clearItem.bind(app);
(window as any).order = app.order.bind(app);
(window as any).startNewOrder = app.startNewOrder.bind(app);

app.loadData(); 