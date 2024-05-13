---
slug: scrapy-vs-crawlee
title: 'Scrapy vs. Crawlee'
description: 'Which web scraping library is best for you?'
image: ./img/scrapy-vs-crawlee.png
author: Saurav Jain
authorTitle: Developer Community Manager
authorURL: https://github.com/souravjain540
authorImageURL: https://avatars.githubusercontent.com/u/53312820?v=4
authorTwitter: sauain
---


Hey, crawling masters!

Welcome to another post on the Crawlee blog; this time, we are going to compare Scrapy with Crawlee, one of the oldest and most popular web scraping libraries in this world. This article will answer your usual questions about when to use Scrapy or when it would be better to use Crawlee instead. This article will be the first part of many articles comparing Crawlee with Scrapy in various technical aspects. 

## Introduction:

[Scrapy](https://scrapy.org/) is an open-source Python-based web scraping framework that extracts data from websites. In Scrapy, you create spiders, which are nothing but autonomous scripts to download and process web content. The limitation of Scrapy is that it does not work very well with JavaScript rendered websites, as it was designed for static HTML pages. We will do a comparison later in the article about this. 

Crawlee is also an open-source library that originated as [Apify SDK](https://docs.apify.com/sdk/js/). Crawlee has the advantage of being a latecomer or, say, the latest library in the market, so it already has many features that Scrapy lacks, like autoscaling, headless browsing, working with JavaScript rendered websites without any plugins, and many more, which we are going to explain later on.

<!--truncate-->

## Feature comparison

There are a lot of things that we can compare between Scrapy and Crawlee. This article will be the first part of a series comparing Scrapy and Crawlee on various parameters. 

We will compare both libraries on various parameters, starting with language and development environments and essential features that make the scraping process easy for developers, like autoscaling, headless browsing, queue management, etc. 


## Language and development environments:

Scrapy is written in Python, making it easier for the data science community to integrate it with various tools with Python. While Scrapy offers very detailed documentation, for first-timers, sometimes it takes work to start with Scrapy. One of the reasons why it is considered not so beginner-friendly[[1]](https://towardsdatascience.com/web-scraping-with-scrapy-theoretical-understanding-f8639a25d9cd)[[2]](https://www.accordbox.com/blog/scrapy-tutorial-1-scrapy-vs-beautiful-soup/#:~:text=Since%20Scrapy%20does%20no%20only,to%20become%20a%20Scrapy%20expert.)[[3]](https://www.udemy.com/tutorial/scrapy-tutorial-web-scraping-with-python/scrapy-vs-beautiful-soup-vs-selenium//1000) is its [complex architecture](https://docs.scrapy.org/en/latest/topics/architecture.html), which consists of various components like spiders, middleware, item pipelines, and settings. For beginners, learning all of these can be a time-consuming task.

Crawlee is one of the few web scraping and automation libraries that supports JavaScript and TypeScript. Crawlee supports CLI as Scrapy does, but the difference that it makes very easy for beginners to start with is their [pre-built templates](https://github.com/apify/crawlee/tree/master/packages/templates/templates) in TypeScript and JavaScript supporting Playwright and Puppeteer. It helps beginners to get a quick understanding of the file structure and how it works.

## Headless browsing and JS rendering

Scrapy does not support headless browsers natively, but it supports them with its plugin system, similarly it does not support scraping JavaScript rendered websites but with plugin system it is possible. One of the best examples of which is its [Playwright plugin](https://github.com/scrapy-plugins/scrapy-playwright/tree/main).  

Apify Store is a JavaScript rendered website, so we wil scrape it in this example using `scrapy-playwright` integration. 

For installation and making changes to [`settings.py`], please follow the instructions on `scrapy-playwright` [repository on GitHub](https://github.com/scrapy-plugins/scrapy-playwright/tree/main?tab=readme-ov-file#installation).

After installation and making changes, create a spider with this code to scrape the data:


```py
    import scrapy

    class ActorSpider(scrapy.Spider):
        name = 'actor_spider'
        start_urls = ['https://apify.com/store']

        def start_requests(self):
            for url in self.start_urls:
                yield scrapy.Request(
                    url,
                    meta={"playwright": True, "playwright_include_page": True},
                    callback=self.parse_playwright
                )

        async def parse_playwright(self, response):
            page = response.meta['playwright_page']
            await page.wait_for_selector('.ActorStoreItem-title-wrapper')
            actor_card = await page.query_selector('.ActorStoreItem-title-wrapper')
            
            if actor_card:
                actor_text = await actor_card.text_content()
                yield {
                    'actor': actor_text.strip() if actor_text else 'N/A'
                }

            await page.close()
```


In Crawlee, you can scrape the JavaScript rendered websites using inbuilt headless [Puppeteer](https://github.com/puppeteer/puppeteer/) and [Playwright](https://github.com/microsoft/playwright) browsers. It is important to note that by default, Crawlee scrapes in headless mode, if you don't want to do headless then just set `headless: false`.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';


<Tabs>
<TabItem value="javscript" label="Playwright">

```js
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    async requestHandler({ page }) {
        const actorCard = page.locator('.ActorStoreItem-title-wrapper').first();
        const actorText = await actorCard.textContent();
        await crawler.pushData({ 
            'actor': actorText 
        });
    },
});

await crawler.run(['https://apify.com/store']);
```

</TabItem>
<TabItem value="js" label="Puppeteer">

```js
import { PuppeteerCrawler } from 'crawlee';

const crawler = new PuppeteerCrawler({
    async requestHandler({ page }) {
        await page.waitForSelector('.ActorStoreItem-title-wrapper');
        const actorText = await page.$eval('.ActorStoreItem-title-wrapper', (el) => {
            return el.textContent;
        });
        await crawler.pushData({ 
            'actor': actorText 
        });
    },
});

await crawler.run(['https://apify.com/store']);
```

</TabItem>
</Tabs>



### Autoscaling Support

Autoscaling refers to the capability of library to automatically adjusting the number of concurrent tasks (such as browser instances, HTTP requests, etc.) based on the current load and system resources. This feature is particularly useful when handling web scraping and crawling tasks that may require dynamically scaled resources to optimize performance, manage system load, and handle rate limitations efficiently.

Scrapy does not have autoscaling capabilities inbuilt, but it can be done using external services like [Scrapyd](https://scrapyd.readthedocs.io/en/latest/) or deployed in a distributed manner with Scrapy Cluster.

Crawlee has [built-in autoscaling](https://crawlee.dev/api/core/class/AutoscaledPool) with `AutoscaledPool`. It increases the number of requests that are processed concurrently within one crawler.

### Queue Management

Scrapy supports both breadth-first and depth-first crawling strategies using a disk-based queuing system. By default, it uses the LIFO queue for the pending requests, which means it is using depth-first order, but if you want to use breadth-first order, you can do it by changing these settings:

```py
DEPTH_PRIORITY = 1 
SCHEDULER_DISK_QUEUE = "scrapy.squeues.PickleFifoDiskQueue" 
SCHEDULER_MEMORY_QUEUE = "scrapy.squeues.FifoMemoryQueue"
```

Crawlee uses breadth-first by default and you can override it on a per-request basis by using the `forefront: true` argument in `addRequest` and its derivatives. If you use `forefront: true` for all requests, it becomes a depth-first process.

### CLI Support

Scrapy has a [powerful command-line interface](https://docs.scrapy.org/en/latest/topics/commands.html#command-line-tool) that offers functionalities like starting a project, generating spiders, and controlling the crawling process.

Scrapy CLI comes with Scrapy installation. Just run this command, and you are good to go:

`pip install scrapy`

Crawlee also [includes a CLI tool](https://crawlee.dev/docs/quick-start#installation-with-crawlee-cli) (`crawlee-cli`) that facilitates project setup, crawler creation and execution, streamlining the development process for users familiar with Node.js environments. The command for installation is: 

`npx crawlee create my-crawler`
 
### Proxy Rotation and Storage Management

Scrapy handles it via custom middleware. You have to install their [`scrapy-rotating-proxies`]((https://pypi.org/project/scrapy-rotating-proxies/)) package using pip. 

`pip install scrapy-rotating-proxies`

Then in the `settings.py` file add `ROTATING_PROXY_LIST` and the middleware to the `DOWNLOADER_MIDDLEWARES` and specify the list of proxy servers. For example:


```py
    DOWNLOADER_MIDDLEWARES = {
        # Lower value means higher priority
        'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
        'scrapy_rotating_proxies.middlewares.RotatingProxyMiddleware': 610,
        'scrapy_rotating_proxies.middlewares.BanDetectionMiddleware': 620,
    }

    ROTATING_PROXY_LIST = [
        'proxy1.com:8000',
        'proxy2.com:8031',
        # Add more proxies as needed
    ]
```

Now create a spider with the code you want to scrape any site and the `ROTATING_PROXY_LIST` in `settings.py` will manage which proxy to use for each request. Here middleware will treat each proxy initially as valid and then when a request is made, the middleware selects a proxy from the list of available proxies. The selection isn't purely sequential but is influenced by the recent history of proxy performance. The middleware has mechanisms to detect when a proxy might be banned or rendered ineffective. When such conditions are detected, the proxy is temporarily deactivated and put into a cooldown period. After the cooldown period expires, the proxy is reconsidered for use.

In Crawlee, you can [use your own proxy servers](https://crawlee.dev/docs/guides/proxy-management) or proxy servers acquired from third-party providers. If you already have your proxy URLs, you can start using them as easy as that:

```js
import { ProxyConfiguration } from 'crawlee';

const proxyConfiguration = new ProxyConfiguration({
    proxyUrls: [
        'http://proxy1.example.com',
        'http://proxy2.example.com',
    ]
});
const crawler = new CheerioCrawler({
    proxyConfiguration,
    // ...
});
```

Crawlee also has [`SessionPool`](https://crawlee.dev/api/core/class/SessionPool), a built-in allocation system for proxies. It handles the rotation, creation, and persistence of user-like sessions. It creates a pool of Session instances that are randomly rotated.

### Data Storage

One of the most frequently required features when implementing scrapers is being able to store the scraped data as an "export file".

Scrapy provides this functionality out of the box with the [`Feed Exports`](https://docs.scrapy.org/en/latest/topics/feed-exports.html), which allows to generate feeds with the scraped items, using multiple serialization formats and storage backends. It supports `csv, json, json lines, xml.`

To do this, you need to modify your `settings.py` file and enter:

```py
    # To store in CSV format 
    FEEDS = { 
        'data/crawl_data.csv': {'format': 'csv', 'overwrite': True} 
    }

    # OR to store in JSON format

    FEEDS = { 
        'data/crawl_data.json': {'format': 'json', 'overwrite': True} 
    }
```

Crawlee's storage can be divided into two categories: Request Storage (Request Queue and Request List) and Results Storage (Datasets and Key Value Stores). Both are stored locally by default in the `./storage` directory.

Also, remember that Crawlee, by default, clears its storages before starting a crawler run. This action is taken to prevent old data from interfering with new crawling sessions.

Let's see how Crawlee stores the result:

- You can use local storage with dataset

```js
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ page }) => {

        const title = await page.title();
        const price = await page.textContent('.price');
    
        await crawler.pushData({
            url: request.url,
            title,
            price
        });
    }
})

await crawler.run(['http://example.com']);
```

- Using Key-Value Store

```js
import { KeyValueStore } from 'crawlee';
//... Code to crawl the data
await KeyValueStore.setValue('key', { foo: 'bar' });
```

### Anti-blocking and Fingerprints

In Scrapy, handling anti-blocking strategies like [IP rotation](https://pypi.org/project/scrapy-rotated-proxy/), [user-agent rotation](https://python.plainenglish.io/rotating-user-agent-with-scrapy-78ca141969fe), custom solutions via middleware, and plugins are needed.

Crawlee provides HTTP crawling and [browser fingerprints](https://crawlee.dev/docs/guides/avoid-blocking) with zero configuration necessary; fingerprints are enabled by default and available in `PlaywrightCrawler` and `PuppeteerCrawler` but work with `CheerioCrawler` and the other HTTP Crawlers too. 

### Error handling

Both libraries support error-handling practices like automatic retries, logging, and custom error handling.

In Scrapy, you can handle errors using middleware and [signals](https://docs.scrapy.org/en/latest/topics/signals.html). There are also [exceptions](https://docs.scrapy.org/en/latest/topics/exceptions.html) like `IgnoreRequest`, which can be raised by Scheduler or any downloader middleware to indicate that the request should be ignored. Similarly, a spider callback can raise' CloseSpider' to close the spider.

Scrapy has built-in support for retrying failed requests. You can configure the retry policy (e.g., the number of retries, retrying on particular HTTP codes) via settings such as `RETRY_TIMES`, as shown in the example:

```py
    # In settings.py
    RETRY_ENABLED = True
    RETRY_TIMES = 2  # Number of retry attempts
    RETRY_HTTP_CODES = [500, 502, 503, 504, 522, 524]  # HTTP error codes to retry
```

In Crawlee, you can also setup your custom error handler. For retries, `maxRequestRetries` controls how often Crawlee will retry a request before marking it as failed. To setup it in code you just need to add the following line of code in your crawler.

```js
const crawler = new CheerioCrawler({
    maxRequestRetries: 3 // Crawler will retry three times.
    // ...
})
```

There is also `noRetry`, if sets to `true` then the request will not be automatically tried.

Crawlee also provides a built-in [logging mechanism](https://crawlee.dev/api/core/class/Log) via `log`, allowing you to log warnings, errors, and other information effectively.

### Deployment using Docker

Scrapy can be containerized using Docker, though it typically requires manual setup to create Dockerfiles and configure environments. While Crawlee includes [ready-to-use Docker configurations](https://crawlee.dev/docs/guides/docker-images), making deployment straightforward across various environments without additional configuration.

## Community 

Both of the projects are open source. Scrapy benefits from a large and well-established community. It has been around since 2008 and has garnered significant attention and usage among developers, particularly those in the Python ecosystem. 

Crawlee started its journey as Apify SDK in 2018. It now has more than [12000 stars on GitHub](https://github.com/apify/crawlee) and a community of more than 7000 developers in their [Discord Community](https://apify.com/discord), used by TypeScript and JavaScript community.

## Conclusion

Both frameworks can handle a wide range of scraping tasks, and the best choice will depend on specific technical needs like language preference, project requirements, ease of use, etc.

If you are comfortable with Python and want to work only with it, go with Scrapy. It has very detailed documentation, and it is one of the oldest and most stable libraries in the space. 

But if you want to explore or are comfortable working with TypeScript or JavaScript, our recommendation is Crawlee. With all the valuable features like a single interface for HTTP requests and headless browsing, making it work well with JavaScript rendered websites, autoscaling and fingerprint support, it is the best choice for scraping websites that can be complex, resource intensive, using JavaScript, or even have blocking methods.

As promised, this is just the first of the many articles comparing Scrapy and Crawlee. With the upcoming articles, you will learn more about every technical detail. 

Meanwhile, if you want to learn more about Crawlee, you can visit the [introduction guide of Crawlee](https://crawlee.dev/docs/introduction).