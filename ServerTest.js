/*
Genesys Connect 5 Tech test
Created by Lauren Keenan Brennan and submitted on the 18/08/2019
Written using node.js, express and socket.io
*/

//setup of the express server and socket.io config
const express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

//arrays to hold user and connection information	
var users = [];
var connections = [];

//initialises game state
var gameBoard = [];
var moveCounter;
createGame();
//intitialises 2d array gameBoard with 0's to show empty postions
//sets moveCounter to 0, moveCounter will be increased each time a player makes a move
function createGame(){
	moveCounter = 0;
	for(i=0;i<6;i++){
		gameBoard[i] = []
		for(j=0;j<9;j++){
			gameBoard[i][j] = 0;
		}
	}
}

//set up of file system
app.use(express.static('public'));

app.get('/', function (req, res) {
	res.sendFile( __dirname + "/" + "index.html" );
})

//socket.io handling of connections happens from here
io.sockets.on('connection',function(socket){
	//if there are less than 2 connections, allow current socket connection
	if(connections.length<2){
		connections.push(socket);
		console.log("Connected: %s socket connected", connections.length);
	} //if there are already 2 connections, disconnect and refuse current socket connection
	else {
		socket.emit('err', { message: 'Reached the limit of connections. Try again later.' });
		socket.disconnect(true);
		console.log('disconnected...');
	}
	
	//on socket disconnect, remove user info from users and connections array
	socket.on('disconnect', function(data){
		//if the socket isnt a user, dont disconnect
		if(!socket.username) return;
		users.splice(users.indexOf(socket.username),1);
		connections.splice(connections.indexOf(socket),1);
		//if a user leaves the game, it runs game over function and resets game for next players
		if(connections.length<2){
			gameOver(socket.username);
			console.log("Disconnected: %s socket connections", connections.length);
		} else{
			console.log("Disconnected: %s socket connections", connections.length);
		}
	});
	
	//new user has joined and username inputted into user array
	socket.on('new user', function(data, callback){
		callback(true);
		socket.username = data;
		//when first user joins game, it shows that they are waiting for the next player
		if(connections.indexOf(socket)==0){
			connections[0].emit('not your turn');
		} //when second player joins game, tells player 1 its their turn to go
		if(connections.indexOf(socket)==1){
			connections[0].emit('your turn', users[0]);
			connections[1].emit('not your turn');
		}
		users.push(socket.username);
	});
	
	//when a player makes a move, it updates the gmaBoard by calling updateMoves
	socket.on('new move', function(data){
		updateMoves(data,connections.indexOf(socket));
	});
	
	//figues out whos turn it is next
	function nextTurn(){
		var turn = moveCounter%2;
		connections[turn].emit('your turn', users[turn]);
	}
	
	//updates game board on the client side using moves made by client
	s
	function updateMoves(col,sock){
		var i = 5;
		//see if do while loop will work
		while(gameBoard[i][col-1]!=0 && i>0){
			i--;
		}
		//if column isnt full, add move to board
		if(gameBoard[i][col-1]==0 && i>=0){
			gameBoard[i][col-1] = sock+1;
			//server checks if theres a winning line and sends back winning message to clients
			if(checkWin(sock+1)==true){
				io.sockets.emit('get moves', gameBoard);
				io.sockets.emit('show win', socket.username);
			}//if theres no winning line, then update game board on client side and move onto players turn
			else{
				moveCounter++;
				nextTurn();
				connections[sock].emit('not your turn');
				io.sockets.emit('get moves', gameBoard);
			}
		} 
		//if column is full, check if whole board is full or just the column is full
		else{
			//checks if game board is full
			var checkFullCount = 0;
			for(i=0;i<6;i++){
				for(j=0;j<9;j++){
					if(gameBoard[i][j]==0){
						checkFullCount++;
					}
				}
			}
			//if game board is not full, then its just the column that is full
			if(checkFullCount!=0){
				socket.emit('err', { message: 'This column is full!' });
			} //if game board is full send game over screen to clients
			else {
				gameOver();
			}
		}
	}
	
	//game over function resets game states and sends game over message to the clients
	function gameOver(){
		io.sockets.emit('game over');
		createGame();
	}
	
	//check for a winning line in the gameBoard array
	function checkWin(sock){
		// horizontal check 
		for (j = 0; j<gameBoard[0].length-4 ; j++ ){
			for (i = 0; i<gameBoard.length; i++){
				if (gameBoard[i][j] == sock && gameBoard[i][j+1] == sock && gameBoard[i][j+2] == sock && gameBoard[i][j+3] == sock && gameBoard[i][j+4] == sock){
					return true;
				}           
			}
		}
		// vertical check
		for (i = 0; i<gameBoard.length-4 ; i++ ){
			for (j = 0; j<gameBoard[0].length; j++){
				if (gameBoard[i][j] == sock && gameBoard[i+1][j] == sock && gameBoard[i+2][j] == sock && gameBoard[i+3][j] == sock && gameBoard[i+4][j] == sock){
					return true;
				}           
			}
		}
		//diagonal checks
		for (i=4; i<gameBoard.length; i++){
			for (j=0; j<gameBoard[0].length-4; j++){
				if (gameBoard[i][j] == sock && gameBoard[i-1][j+1] == sock && gameBoard[i-2][j+2] == sock && gameBoard[i-3][j+3] == sock && gameBoard[i-4][j+4] == sock){
					return true;
				}
			}
		}
		for (i=4; i<gameBoard.length; i++){
			for (j=4; j<gameBoard[0].length; j++){
				if (gameBoard[i][j] == sock && gameBoard[i-1][j-1] == sock && gameBoard[i-2][j-2] == sock && gameBoard[i-3][j-3] == sock && gameBoard[i-4][j-4] == sock){
					return true;
				}
			}
		}
		return false;
	}
});

//runs server
server.listen(3000, function () {
	var port = server.address().port;
	console.log("Example app listening at http://localhost:%s", port);
});