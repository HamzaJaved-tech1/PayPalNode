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
      if (
        cardFields?._state.fields.cvv.isEmpty ||
        cardFields?._state.fields.expirationDate.isEmpty ||
        cardFields?._state.fields.number.isEmpty
      ) {
        Swal.fire({
          title: "Error!",
          text: "Please fill in all the required fields correctly before proceeding with payment.",

          confirmButtonText: "Ok",
        });
        return;
      }
      const myButton = document.getElementById("formPayButton");
      myButton.disabled = true;
      myButton.classList.add("loading");
      cardFields
        .submit({
          // Cardholder's first and last name
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
            body: {
              payment_source: {
                paypal: {
                  attributes: {
                    customer: {
                      email_address: "dummy@mail.com",
                    },
                  },
                },
              },
            },
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

                Swal.fire({
                  title: "Error!",
                  text: msg,
                  confirmButtonText: "Ok",
                });
                return;
              }

              const paymentStatus =
                orderData.purchase_units[0].payments.captures[0].status ||
                "DECLINED";
              if (paymentStatus === "DECLINED") {
                Swal.fire({
                  title: "Error!",
                  text: "Payment has already been declined. Please try again",

                  confirmButtonText: "Ok",
                });
                return;
              }
              const myButton = document.getElementById("formPayButton");
              myButton.disabled = false;
              fetch(
                "https://shoptherocknl.ca/str-2.0/str-app/minions/paypal-logs",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    purchase_id:
                      orderData.purchase_units[0].payments.captures[0].id,
                    purchase_amount:
                      orderData.purchase_units[0].payments.captures[0].amount
                        .value,
                    purchase_status: orderData.status,
                  }),
                }
              )
                .then((response) => response.json())
                .then((response) => {
                  myButton.classList.remove("loading");
                  localStorage.setItem(
                    "payloadNonce",
                    orderData.purchase_units[0].payments.captures[0].id
                  );
                });

              // Show a success message or redirect
              //  window.location.href = "thankyou.html";
            });
        })
        .catch((err) => {
          const myButton = document.getElementById("formPayButton");
          myButton.disabled = false;

          myButton.classList.remove("loading");
          Swal.fire({
            title: "Error!",
            text: "There was an error processing your payment. Please try again.",

            confirmButtonText: "Ok",
          });
        });
    });
  });
} else {
  // Hides card fields if the merchant isn't eligible
  document.querySelector("#card-form").style = "display: none";
}
