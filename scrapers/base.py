import time
import logging
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


class BaseScraper:
    BASE_URL = "https://www.fussball.de"
    LEAGUE_SLUG = "herren-stadtklasse-kreis-leipzig-kreisliga-a-herren-saison2526-sachsen"
    STAFFEL_ID = "02TKCSME94000008VS5489BUVUD1610F-G"
    TOTAL_MATCHDAYS = 26

    def __init__(self, delay: float = 1.5):
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def get(self, url: str, retries: int = 3) -> Optional[BeautifulSoup]:
        """Fetch a URL and return a BeautifulSoup object. Retries on failure."""
        wait = 2
        for attempt in range(retries):
            try:
                logger.debug(f"GET {url}")
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                time.sleep(self.delay)
                return BeautifulSoup(response.text, "lxml")
            except requests.exceptions.HTTPError as e:
                logger.warning(f"HTTP {e.response.status_code} for {url} (attempt {attempt + 1}/{retries})")
                if e.response.status_code in (403, 404):
                    return None
                if attempt < retries - 1:
                    time.sleep(wait)
                    wait *= 2
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request error for {url}: {e} (attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    time.sleep(wait)
                    wait *= 2
        logger.error(f"Failed to fetch {url} after {retries} attempts")
        return None

    def matchday_url(self, matchday: int) -> str:
        return (
            f"{self.BASE_URL}/spieltag/{self.LEAGUE_SLUG}/-"
            f"/spieltag/{matchday}/staffel/{self.STAFFEL_ID}"
        )

    def current_matchday_url(self) -> str:
        return (
            f"{self.BASE_URL}/spieltag/{self.LEAGUE_SLUG}/-"
            f"/staffel/{self.STAFFEL_ID}"
        )

    def top_scorers_url(self) -> str:
        return (
            f"{self.BASE_URL}/torjaeger/{self.LEAGUE_SLUG}/-"
            f"/staffel/{self.STAFFEL_ID}"
        )
