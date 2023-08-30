// If this returns false or the card fields aren't visible, see Step #1.
if (paypal.HostedFields.isEligible()) {
  let orderId;

  // Renders card fields
  paypal.HostedFields.render({
    // Call your server to set up the transaction
    createOrder: () => {
      return fetch("/api/orders", {
        method: "post",
        // use the "body" param to optionally pass additional order information
        // like product skus and quantities
        body: JSON.stringify({
          cart: [
            {
              sku: "<YOUR_PRODUCT_STOCK_KEEPING_UNIT>",
              quantity: "<YOUR_PRODUCT_QUANTITY>",
            },
          ],
        }),
      })
        .then((res) => res.json())
        .then((orderData) => {
          orderId = orderData.id; // needed later to complete capture
          return orderData.id;
        });
    },
    styles: {
      ".valid": {
        color: "green",
      },
      ".invalid": {
        color: "red",
      },
    },
    fields: {
      number: {
        selector: "#card-number",
        placeholder: "4111 1111 1111 1111",
      },
      cvv: {
        selector: "#cvv",
        placeholder: "123",
      },
      expirationDate: {
        selector: "#expiration-date",
        placeholder: "MM/YY",
      },
    },
  }).then((cardFields) => {
    document.querySelector("#card-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const myButton = document.getElementById("formPayButton");
      myButton.disabled = true;
      myButton.classList.add("loading");
      cardFields
        .submit({
          // Cardholder's first and last name
          // cardholderName: document.getElementById("card-holder-name").value,
          // Billing Address
          // billingAddress: {
          //   // Street address, line 1
          //   streetAddress: document.getElementById(
          //     "card-billing-address-street"
          //   ).value,
          //   // Street address, line 2 (Ex: Unit, Apartment, etc.)
          //   extendedAddress: document.getElementById(
          //     "card-billing-address-unit"
          //   ).value,
          //   // State
          //   region: document.getElementById("card-billing-address-state").value,
          //   // City
          //   locality: document.getElementById("card-billing-address-city")
          //     .value,
          //   // Postal Code
          //   postalCode: document.getElementById("card-billing-address-zip")
          //     .value,
          //   // Country Code
          //   countryCodeAlpha2: document.getElementById(
          //     "card-billing-address-country"
          //   ).value,
          // },
        })
        .then(() => {
          fetch(`/api/orders/${orderId}/capture`, {
            method: "post",
          })
            .then((res) => res.json())
            .then((orderData) => {
              console.log(orderData);
              // Two cases to handle:
              //   (1) Other non-recoverable errors -> Show a failure message
              //   (2) Successful transaction -> Show confirmation or thank you
              // This example reads a v2/checkout/orders capture response, propagated from the server
              // You could use a different API or structure for your 'orderData'
              const errorDetail =
                Array.isArray(orderData.details) && orderData.details[0];
              if (errorDetail) {
                var msg =
                  "There was an error processing your payment. Please try again.";
                return alert(msg); // Show a failure message
              }
              const myButton = document.getElementById("formPayButton");
              myButton.disabled = false;

              myButton.classList.remove("loading");
              localStorage.setItem("payloadNonce", orderData.id);
              // Show a success message or redirect
              window.location.href = "thankyou.html";
            });
        })
        .catch((err) => {
          const myButton = document.getElementById("formPayButton");
          myButton.disabled = false;

          myButton.classList.remove("loading");
          alert(
            "There was an error processing your payment. Please try again."
          ); // Show a failure message
        });
    });
  });
} else {
  // Hides card fields if the merchant isn't eligible
  document.querySelector("#card-form").style = "display: none";
}
