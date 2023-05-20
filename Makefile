build: 
 docker build -t arturktgbot .

 run: 
  docker run -d -p 3000:3000 --name arturktgbot --rm arturktgbot