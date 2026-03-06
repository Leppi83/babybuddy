# -*- coding: utf-8 -*-
import json
import re

from django.test import TestCase
from django.test import Client as HttpClient
from django.contrib.auth import get_user_model
from django.core.management import call_command

from faker import Faker

from core import models


def _bootstrap_payload(response):
    match = re.search(
        rb'<script id="ant-app-bootstrap" type="application/json">(.*?)</script>',
        response.content,
        re.DOTALL,
    )
    if not match:
        return None
    return json.loads(match.group(1).decode("utf-8"))


class ViewsTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super(ViewsTestCase, cls).setUpClass()
        fake = Faker()
        call_command("migrate", verbosity=0)
        call_command("fake", verbosity=0)

        cls.c = HttpClient()

        fake_user = fake.simple_profile()
        cls.credentials = {
            "username": fake_user["username"],
            "password": fake.password(),
        }
        cls.user = get_user_model().objects.create_user(
            is_superuser=True, **cls.credentials
        )

        cls.c.login(**cls.credentials)

    def test_graph_child_views(self):
        child = models.Child.objects.first()
        base_url = "/children/{}/reports".format(child.slug)

        page = self.c.get(base_url)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, "ant-app-bootstrap")
        payload = _bootstrap_payload(page)
        self.assertIsNone(payload.get("childSwitcher"))

        second_child = models.Child.objects.create(
            first_name="Second", last_name="Child", birth_date="2000-01-01"
        )
        page = self.c.get(base_url)
        payload = _bootstrap_payload(page)
        self.assertEqual(payload["childSwitcher"]["value"], child.slug)
        option_map = {
            option["value"]: option["href"]
            for option in payload["childSwitcher"]["options"]
        }
        self.assertEqual(
            option_map[second_child.slug], f"/children/{second_child.slug}/reports"
        )

        page = self.c.get("{}/bmi/bmi/".format(base_url))
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, "ant-app-bootstrap")
        payload = _bootstrap_payload(page)
        option_map = {
            option["value"]: option["href"]
            for option in payload["childSwitcher"]["options"]
        }
        self.assertEqual(
            option_map[second_child.slug],
            f"/children/{second_child.slug}/reports/bmi/bmi/",
        )

        page = self.c.get("{}/changes/amounts/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/changes/lifetimes/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/changes/types/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/changes/intervals/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/feeding/amounts/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/feeding/duration/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/feeding/intervals/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/feeding/pattern/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/head-circumference/head-circumference/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/height/height/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/pumping/amounts/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/sleep/pattern/".format(base_url))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("{}/sleep/totals/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/temperature/temperature/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/tummy-time/duration/".format(base_url))
        self.assertEqual(page.status_code, 200)

        page = self.c.get("{}/weight/weight/".format(base_url))
        self.assertEqual(page.status_code, 200)
