install:	
	# run initalisation script
	sh ./src/init.sh

	# Deploy external project network
	-- docker network create goatFish_backend
	
	# Bring the project down
	-- cd src && docker-compose -f docker-compose.yml down

	# Build core logic
	cd src && docker-compose -f docker-compose.yml up -d --build

	sleep 60

duke-nukem:
	- docker kill $$(docker ps -q)
	- docker rm $$(docker ps -a -q)
	- docker rmi $$(docker images -q)
	- docker volume prune


