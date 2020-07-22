install:	
	sh ./src/init.sh

	# Deploy external project network
	-- docker network create goatFish_backend
	
	docker pull lucasxhy/strategy_baseline:0.0.11
	
	# Bring the project down
	-- cd src && docker-compose -f docker-compose.yml down
	-- cd src && docker-compose -f docker-compose.test.yml down

	# Build core logic
	cd src && docker-compose -f docker-compose.yml up -d --build

	sleep 60

test:	
	@echo "This action will reset the database and all its contents are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]

	@echo "Also are you like 100% sure youre not running on production? [y/N] " && read ans && [ $${ans:-N} = y ]

	sh ./src/init.sh

	rm -rf ./src/postgres/data

	# Deploy external project network
	-- docker network create goatFish_backend
	
	# Bring the project down
	-- cd src && docker-compose -f docker-compose.yml down
	-- cd src && docker-compose -f docker-compose.test.yml down	
	
	# Build the tests 
	cd src && docker-compose -f docker-compose.test.yml  up -d --build

	# Follow the progress of the test
	docker logs test -f

.PHONY: test

duke-nukem:
	- docker kill $$(docker ps -q)
	- docker rm $$(docker ps -a -q)
	- docker rmi $$(docker images -q)
	- docker volume prune


