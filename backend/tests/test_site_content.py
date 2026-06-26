import unittest

from fastapi.testclient import TestClient

from main import app


class SiteContentTest(unittest.TestCase):
    def test_site_content_returns_projects_and_tools_from_api(self) -> None:
        with TestClient(app) as client:
            response = client.get("/site/content")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        project_titles = {item["title"] for item in payload["projects"]}
        tool_titles = {item["title"] for item in payload["tools"]}

        self.assertIn("BuTaiLingSearch", project_titles)
        self.assertIn("TeleVideoUpload", project_titles)
        self.assertIn("Model tester", tool_titles)
        self.assertTrue(all("href" in item for item in payload["projects"]))
        self.assertTrue(all("href" in item for item in payload["tools"]))


if __name__ == "__main__":
    unittest.main()
