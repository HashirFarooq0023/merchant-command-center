const data = `Jee, humare paas yeh products available hain 👇  
1. Basic T-Shirt 
🏷️ Price: Rs. 20.0  
🔗 Here is a red t-shirt
[Product Image](https://via.placeholder.com/400/FF0000/FFFFFF?text=Red+T-Shirt)

Aap in mein se kis product ka order dena chahte hain?`;

let textContent = data;
const imgRegex = /(?:\[.*?\]\((https?:\/\/[^\s\)]+)\))|(?:Image URL:\s*(https?:\/\/[^\s]+))/gi;

const imageUrls = [];
let match;

// Extract all URLs
while ((match = imgRegex.exec(data)) !== null) {
    const url = match[1] || match[2];
    if (url) {
        imageUrls.push(url);
    }
}

// Clean the text by ripping out all image references
textContent = textContent.replace(imgRegex, '').trim();

console.log("TEXT:");
console.log(textContent);
console.log("-------------------");
console.log("IMAGES:", imageUrls);
