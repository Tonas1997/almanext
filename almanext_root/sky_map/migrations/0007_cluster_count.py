# Generated by Django 3.1.7 on 2021-06-05 20:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sky_map', '0006_cluster_processed'),
    ]

    operations = [
        migrations.AddField(
            model_name='cluster',
            name='count',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
    ]
