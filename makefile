install:	
	sh init.sh

	# Deploy external project network
	-- docker network create goatFish_backend
	
	docker pull lucasxhy/strategy_baseline:0.0.11
	
	# Bring the project down
	-- cd backend && docker-compose -f docker-compose.yml down
	-- cd backend && docker-compose -f docker-compose.test.yml down	
	-- cd backend && docker-compose -f docker-compose.debug.yml down	

	# Build core logic
	cd backend && docker-compose -f docker-compose.yml up -d --build
	cd backend && docker-compose -f docker-compose.debug.yml  up -d --build

	sleep 60

test:	
	@echo "This action will reset the databse and all its contents are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]

	@echo "Also are you like 100% sure youre not running on production? [y/N] " && read ans && [ $${ans:-N} = y ]

	@echo "Fingers crossed then!\n" 

	sh init.sh

	rm -rf ./backend/postgres/data

	# Deploy external project network
	-- docker network create goatFish_backend
	
		# Bring the project down
	-- cd backend && docker-compose -f docker-compose.yml down
	-- cd backend && docker-compose -f docker-compose.test.yml down	
	-- cd backend && docker-compose -f docker-compose.debug.yml down	

	# Build core logic
	cd backend && docker-compose -f docker-compose.yml up -d --build
	cd backend && docker-compose -f docker-compose.debug.yml  up -d --build

	sleep 60
	
	# Build the tests 
	cd backend && docker-compose -f docker-compose.test.yml  up -d --build

	# Follow the progress of the test
	docker logs test -f

.PHONY: test

test-debug:
	@echo "This action will reset the databse and all its contents are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]

	@echo "Also are you like 100% sure youre not running on production? [y/N] " && read ans && [ $${ans:-N} = y ]

	@echo "Fingers crossed then!\n" 

	# Deploy external project network
	-- docker network create goatFish_backend

	# Build core logic
	-- cd backend && docker-compose -f docker-compose.yml down	
	cd backend && docker-compose -f docker-compose.yml up --scale kafka_1=3 -d --build

	# Build debuging tools
	-- cd backend && docker-compose -f docker-compose.debug.yml down	
	cd backend && docker-compose -f docker-compose.debug.yml  up -d --build

	# Build the tests 
	-- cd backend && docker-compose -f docker-compose.test.yml down	
	cd backend && docker-compose -f docker-compose.test.yml  up -d --build

	# Follow the progress of the test
	docker logs test -f  

.PHONY: test

duke-nukem:
	- docker kill $$(docker ps -q)
	- docker rm $$(docker ps -a -q)
	- docker rmi $$(docker images -q)
	- docker volume prune


