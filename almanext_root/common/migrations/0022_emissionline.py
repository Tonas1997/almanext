# Generated by Django 2.2.10 on 2021-01-10 16:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0021_delete_emissionline'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmissionLine',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('species', models.CharField(max_length=25)),
                ('line', models.CharField(max_length=25)),
                ('frequency', models.FloatField()),
            ],
        ),
    ]
